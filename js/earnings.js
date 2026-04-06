// ===============================
// EARNINGS LOGIC (LEDGER + LEGACY SAFE)
// ===============================

import { protectPage } from "./auth.js"

let supabase = null
let chartInstance = null
let eventsMap = {}
let eventsClientMap = {}
let withdrawData = null
let currentUserId = null

let purchaseData = []
let ledgerData = []

let dashboardState = {
  totalEarnings: 0,
  monthlyEarnings: 0,
  totalSales: 0,
  platformTotal: 0,
  pendingTotal: 0,
  availableBalance: 0,
  photographerGross: 0
}

let earningsChannel = null

async function init() {
  await protectPage()

  supabase = await window.getSupabase()
  if (!supabase) {
    alert("Supabase not initialized")
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    alert("User not found")
    return
  }

  currentUserId = user.id

  await loadEventsMap()
  await refreshDashboard()

  setupRealtime()
  setupExport()
  setupPayout()
}

// ===============================
// LOAD EVENTS MAP
// ===============================

async function loadEventsMap() {
  const { data, error } = await supabase
    .from("events")
    .select("id, event_name, client_name")

  if (!error && data) {
    eventsMap = {}
    eventsClientMap = {}

    data.forEach(e => {
      const key = String(e.id)
      eventsMap[key] = e.event_name || e.client_name || "Event"
      eventsClientMap[key] = e.client_name || ""
    })
  }
}

// ===============================
// REFRESH
// ===============================

async function refreshDashboard() {
  await loadEarnings()
  await loadWithdrawStatus()
}

// ===============================
// MAIN DATA LOAD
// ===============================

async function loadEarnings() {
  try {
    if (!currentUserId) return

    const [
      purchasesRes,
      ledgerRes
    ] = await Promise.all([
      supabase
        .from("image_purchases")
        .select("*")
        .eq("photographer_id", currentUserId)
        .order("created_at", { ascending: false }),

      supabase
        .from("earnings_ledger")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
    ])

    if (purchasesRes.error) {
      console.error("Failed to fetch image purchases:", purchasesRes.error)
      alert("Failed to fetch earnings")
      return
    }

    if (ledgerRes.error) {
      console.error("Failed to fetch earnings ledger:", ledgerRes.error)
      alert("Failed to fetch earnings ledger")
      return
    }

    purchaseData = purchasesRes.data || []
    ledgerData = ledgerRes.data || []

    await processAndRender(purchaseData, ledgerData)

  } catch (err) {
    console.error(err)
    alert("Something went wrong")
  }
}

// ===============================
// WITHDRAW STATUS
// ===============================

async function loadWithdrawStatus() {
  try {
    if (!currentUserId) return

    const { data: requests, error } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("photographer_id", currentUserId)
      .order("created_at", { ascending: false })

    const statusEl = document.getElementById("withdrawStatus")
    if (!statusEl) return

    statusEl.classList.add("hidden")
    statusEl.innerText = ""

    if (error || !requests || requests.length === 0) return

    const pending = requests.find(r => r.status === "pending")

    if (pending) {
      statusEl.classList.remove("hidden")
      statusEl.innerText = `⏳ Withdrawal ₹${Math.round(Number(pending.amount || 0))} is processing`
    }

  } catch (err) {
    console.error(err)
  }
}

// ===============================
// REALTIME
// ===============================

function setupRealtime() {
  if (!supabase || !currentUserId) return

  if (earningsChannel) {
    try {
      supabase.removeChannel(earningsChannel)
    } catch (e) {}
  }

  earningsChannel = supabase
    .channel(`earnings-live-${currentUserId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "image_purchases",
        filter: `photographer_id=eq.${currentUserId}`
      },
      async () => {
        await refreshDashboard()
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "earnings_ledger",
        filter: `user_id=eq.${currentUserId}`
      },
      async () => {
        await refreshDashboard()
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payout_requests",
        filter: `photographer_id=eq.${currentUserId}`
      },
      async () => {
        await refreshDashboard()
      }
    )
    .subscribe()
}

// ===============================
// HELPERS
// ===============================

function toSafeNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function buildLedgerTrackedPaymentIdSet(entries) {
  const set = new Set()

  ;(entries || []).forEach(item => {
    if (!item) return
    if (item.source !== "image_purchase") return
    if (item.entry_type !== "credit") return

    const note = String(item.notes || "").trim()
    if (!note) return

    if (note.startsWith("razorpay_payment_id:")) {
      const paymentId = note.replace("razorpay_payment_id:", "").trim()
      if (paymentId) {
        set.add(paymentId)
      }
    }
  })

  return set
}

function buildLegacyLedgerEntriesFromPurchases(purchases, entries) {
  const trackedPaymentIds = buildLedgerTrackedPaymentIdSet(entries)

  return (purchases || []).reduce((acc, item) => {
    if (!item) return acc

    const paymentId = String(item.razorpay_payment_id || "").trim()

    // If ledger already has this purchase via payment id, skip legacy fallback.
    if (paymentId && trackedPaymentIds.has(paymentId)) {
      return acc
    }

    const amount = toSafeNumber(item.photographer_amount)
    if (amount <= 0) return acc

    acc.push({
      id: `legacy_${item.id || crypto.randomUUID?.() || Date.now()}`,
      user_id: item.photographer_id || currentUserId,
      event_id: item.event_id || null,
      payment_transaction_id: null,
      amount,
      entry_type: "credit",
      source: "image_purchase",
      status: "completed",
      notes: paymentId ? `legacy_razorpay_payment_id:${paymentId}` : "legacy_image_purchase",
      created_at: item.created_at
    })

    return acc
  }, [])
}

async function getPendingAmount(userId) {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("amount")
    .eq("photographer_id", userId)
    .eq("status", "pending")

  if (error || !data) return 0

  return data.reduce((sum, item) => sum + toSafeNumber(item.amount), 0)
}

// ===============================
// PROCESS
// ===============================

async function processAndRender(purchases, ledgerEntries) {
  if (!Array.isArray(purchases)) purchases = []
  if (!Array.isArray(ledgerEntries)) ledgerEntries = []

  const completedLedgerEntries = ledgerEntries.filter(item => {
    if (!item) return false
    return String(item.status || "completed") === "completed"
  })

  const legacyLedgerEntries = buildLegacyLedgerEntriesFromPurchases(
    purchases,
    completedLedgerEntries
  )

  const combinedLedgerEntries = [
    ...completedLedgerEntries,
    ...legacyLedgerEntries
  ]

  let netTotal = 0
  let monthlyNet = 0
  let photographerGross = 0
  let platformTotal = 0
  const totalSales = purchases.length
  const now = new Date()

  combinedLedgerEntries.forEach(item => {
    if (!item) return

    const amount = toSafeNumber(item.amount)
    const entryType = String(item.entry_type || "credit")
    const signedAmount = entryType === "debit" ? -amount : amount

    netTotal += signedAmount

    const d = new Date(item.created_at)
    if (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    ) {
      monthlyNet += signedAmount
    }
  })

  purchases.forEach(item => {
    if (!item) return
    photographerGross += toSafeNumber(item.photographer_amount)
    platformTotal += toSafeNumber(item.platform_amount)
  })

  const pendingTotal = await getPendingAmount(currentUserId)
  const availableBalance = Math.max(0, Math.round(netTotal) - Math.round(pendingTotal))

  dashboardState = {
    totalEarnings: Math.round(netTotal),
    monthlyEarnings: Math.round(monthlyNet),
    totalSales,
    platformTotal: Math.round(platformTotal),
    pendingTotal: Math.round(pendingTotal),
    availableBalance,
    photographerGross: Math.round(photographerGross)
  }

  const totalEarningsEl = document.getElementById("totalEarnings")
  const totalSalesEl = document.getElementById("totalSales")
  const monthlyEarningsEl = document.getElementById("monthlyEarnings")
  const balanceEl = document.getElementById("availableBalance")

  if (totalEarningsEl) totalEarningsEl.innerText = "₹" + dashboardState.totalEarnings
  if (totalSalesEl) totalSalesEl.innerText = dashboardState.totalSales
  if (monthlyEarningsEl) monthlyEarningsEl.innerText = "₹" + dashboardState.monthlyEarnings
  if (balanceEl) balanceEl.innerText = "₹" + dashboardState.availableBalance

  renderTransactions(purchases)
  renderMonthlyAnalytics(combinedLedgerEntries)
  renderTopEvents(purchases)
  renderClientEarnings(purchases)
  renderProfitSplit(dashboardState.photographerGross, dashboardState.platformTotal)
}

// ===============================
// PAYOUT
// ===============================

function setupPayout() {
  const btn = document.getElementById("withdrawBtn")
  if (!btn) return

  btn.addEventListener("click", requestPayout)
}

async function requestPayout() {
  try {
    if (!currentUserId) {
      alert("User not found")
      return
    }

    const available = Math.max(0, toSafeNumber(dashboardState.availableBalance))

    if (available <= 0) {
      alert("No balance available")
      return
    }

    if (available < 500) {
      alert("Minimum withdrawal amount is ₹500")
      return
    }

    const { data: existing, error: existingError } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("photographer_id", currentUserId)
      .eq("status", "pending")

    if (existingError) {
      console.error(existingError)
      alert("Failed to check pending withdrawal")
      return
    }

    if (existing && existing.length > 0) {
      alert("You already have a pending withdrawal request")
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("photographer_settings")
      .select("owner_name, upi")
      .eq("user_id", currentUserId)
      .single()

    if (profileError) {
      console.error(profileError)
    }

    if (!profile || !profile.upi) {
      alert("Please set your UPI ID in profile first")
      window.location.href = "profile.html"
      return
    }

    withdrawData = {
      user_id: currentUserId,
      amount: available,
      upi: profile.upi,
      name: profile.owner_name || "Not Set"
    }

    const modalName = document.getElementById("modalName")
    const modalUpi = document.getElementById("modalUpi")
    const modalAmount = document.getElementById("modalAmount")
    const modal = document.getElementById("withdrawModal")

    if (modalName) modalName.innerText = withdrawData.name
    if (modalUpi) modalUpi.innerText = withdrawData.upi
    if (modalAmount) modalAmount.innerText = withdrawData.amount

    if (modal) {
      modal.classList.remove("hidden")
      modal.classList.add("flex")
    }

  } catch (err) {
    console.error(err)
    alert("Something went wrong")
  }
}

// ===============================
// EXPORT
// ===============================

function setupExport() {
  const btn = document.getElementById("exportBtn")
  if (!btn) return

  btn.addEventListener("click", () => exportCSV(purchaseData))
}

function exportCSV(data) {
  if (!data || !data.length) return

  const rows = [
    ["Event", "Buyer", "Amount"],
    ...data.map(d => [
      eventsMap[String(d.event_id)] || "Event",
      d.buyer_name || "Guest",
      toSafeNumber(d.photographer_amount)
    ])
  ]

  const csv = rows.map(r => r.join(",")).join("\n")

  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = "earnings.csv"
  a.click()
}

// ===============================
// TOP EVENTS
// ===============================

function renderTopEvents(data) {
  const container = document.getElementById("topEvents")
  if (!container) return

  const map = {}

  data.forEach(item => {
    if (!item) return
    const id = String(item.event_id)
    map[id] = (map[id] || 0) + toSafeNumber(item.photographer_amount)
  })

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  container.innerHTML = sorted.map(([id, amount]) => `
    <div class="flex justify-between">
      <span>${eventsMap[id] || "Event"}</span>
      <span class="text-green-400">₹${Math.round(amount)}</span>
    </div>
  `).join("")
}

// ===============================
// TRANSACTIONS
// ===============================

function renderTransactions(data) {
  const container = document.getElementById("transactionsList")
  if (!container) return

  const last2 = data.slice(0, 2)

  container.innerHTML = last2.map(item => `
    <div onclick="window.location.href='transactions.html'"
         class="glass p-3 rounded-xl flex justify-between cursor-pointer">
      <div>
        <p>${eventsMap[String(item.event_id)] || "Event"} (${item.buyer_name || "Guest"})</p>
        <p>${new Date(item.created_at).toLocaleString()}</p>
      </div>
      <div>₹${Math.round(toSafeNumber(item.photographer_amount))}</div>
    </div>
  `).join("")
}

// ===============================
// GRAPH
// ===============================

function renderMonthlyAnalytics(data) {
  const ctx = document.getElementById("monthlyChart")
  if (!ctx || typeof Chart === "undefined") return

  const months = {}

  data.forEach(item => {
    if (!item) return

    const d = new Date(item.created_at)
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    const amount = toSafeNumber(item.amount)
    const signedAmount = String(item.entry_type) === "debit" ? -amount : amount

    months[key] = (months[key] || 0) + signedAmount
  })

  const sortedLabels = Object.keys(months).sort((a, b) => {
    const [am, ay] = a.split("/").map(Number)
    const [bm, by] = b.split("/").map(Number)
    return new Date(ay, am - 1, 1) - new Date(by, bm - 1, 1)
  })

  const sortedValues = sortedLabels.map(label => Math.round(months[label]))

  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: sortedLabels,
      datasets: [{
        label: "Earnings",
        data: sortedValues,
        tension: 0.4
      }]
    }
  })
}

// ===============================
// CLIENT EARNINGS
// ===============================

function renderClientEarnings(data) {
  const container = document.getElementById("clientEarnings")
  if (!container) return

  const last2 = data.slice(0, 2)

  container.innerHTML = last2.map(item => `
    <div class="flex justify-between">
      <span>${eventsMap[String(item.event_id)] || "Event"} (${item.buyer_name || "Guest"})</span>
      <span class="text-green-400">₹${Math.round(toSafeNumber(item.photographer_amount))}</span>
    </div>
  `).join("")
}

// ===============================
// PROFIT SPLIT
// ===============================

function renderProfitSplit(photographer, platform) {
  const container = document.getElementById("profitSplit")
  if (!container) return

  container.innerHTML = `
    <div class="flex justify-between">
      <span>Photographer</span>
      <span class="text-green-400">₹${Math.round(toSafeNumber(photographer))}</span>
    </div>
    <div class="flex justify-between">
      <span>Platform</span>
      <span class="text-yellow-400">₹${Math.round(toSafeNumber(platform))}</span>
    </div>
  `
}

// ===============================
// WITHDRAW MODAL
// ===============================

function closeWithdrawModal() {
  const modal = document.getElementById("withdrawModal")
  if (!modal) return

  modal.classList.add("hidden")
  modal.classList.remove("flex")
}

function goToProfile() {
  window.location.href = "profile.html"
}

async function confirmWithdrawFinal() {
  if (!withdrawData) return

  try {
    const res = await fetch(
      "https://gnnaaagvlrmdveqxicob.functions.supabase.co/create-withdraw-request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: withdrawData.user_id,
          amount: withdrawData.amount,
          upi_id: withdrawData.upi,
          name: withdrawData.name
        })
      }
    )

    const result = await res.json()

    if (!result.success) {
      alert(result.error || "Withdraw failed")
      return
    }

    closeWithdrawModal()
    alert(`Withdraw request submitted ₹${withdrawData.amount} ✅`)

    await refreshDashboard()

  } catch (err) {
    console.error(err)
    alert("Withdraw failed")
  }
}

init()

window.closeWithdrawModal = closeWithdrawModal
window.goToProfile = goToProfile
window.confirmWithdrawFinal = confirmWithdrawFinal