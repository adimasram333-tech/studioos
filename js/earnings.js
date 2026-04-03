// ===============================
// EARNINGS LOGIC (PRO FINAL SAFE FIX)
// ===============================

import { protectPage } from "./auth.js"

let supabase = null
let originalData = []
let chartInstance = null
let eventsMap = {}
let eventsClientMap = {}

async function init() {
  await protectPage()

  supabase = await window.getSupabase()
  if (!supabase) {
    alert("Supabase not initialized")
    return
  }

  await loadEventsMap()
  await loadEarnings()
  await loadWithdrawStatus()

  setupRealtime()
  setupExport()
  setupPayout()
}

// ===============================
// LOAD EVENTS MAP (FIXED)
// ===============================

async function loadEventsMap() {
  const { data, error } = await supabase
    .from("events")
    .select("id, event_name, client_name")

  if (!error && data) {
    data.forEach(e => {
      const key = String(e.id)
      eventsMap[key] = e.event_name || e.client_name || "Event"
      eventsClientMap[key] = e.client_name || ""
    })
  }
}

// ===============================
// MAIN
// ===============================

async function loadEarnings() {
  try {

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("image_purchases")
      .select("*")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      alert("Failed to fetch earnings")
      return
    }

    originalData = data || []
    processAndRender(originalData)

  } catch (err) {
    console.error(err)
    alert("Something went wrong")
  }
}

// ===============================
// 🔥 WITHDRAW STATUS + FIX
// ===============================

async function loadWithdrawStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: requests } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: false })

    if (!requests || requests.length === 0) return

    const pending = requests.find(r => r.status === "pending")

    const statusEl = document.getElementById("withdrawStatus")

    if (pending && statusEl) {
      statusEl.classList.remove("hidden")
      statusEl.innerText = `⏳ Withdrawal ₹${Math.round(pending.amount)} is processing`
    }

  } catch (err) {
    console.error(err)
  }
}

// ===============================
// REALTIME
// ===============================

function setupRealtime() {

  if (!supabase) return

  supabase
    .channel("earnings-live")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "image_purchases"
      },
      (payload) => {

        if (!payload || !payload.new) return

        originalData.unshift(payload.new)
        processAndRender(originalData)
      }
    )
    .subscribe()
}

// ===============================
// PROCESS (🔥 BALANCE FREEZE FIX)
// ===============================

async function processAndRender(data) {

  if (!Array.isArray(data)) return

  let total = 0
  let totalSales = data.length
  let thisMonth = 0
  let platformTotal = 0

  const now = new Date()

  data.forEach(item => {

    if (!item) return

    total += item.photographer_amount || 0
    platformTotal += item.platform_amount || 0

    const d = new Date(item.created_at)

    if (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    ) {
      thisMonth += item.photographer_amount || 0
    }
  })

  const totalRounded = Math.round(total)

  // 🔥 FETCH PENDING
  const { data: { user } } = await supabase.auth.getUser()

  let pendingTotal = 0

  if (user) {
    const { data: pendingData } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("photographer_id", user.id)
      .eq("status", "pending")

    pendingTotal = (pendingData || []).reduce((s, r) => s + (r.amount || 0), 0)
  }

  const availableBalance = Math.max(0, totalRounded - Math.round(pendingTotal))

  document.getElementById("totalEarnings").innerText = "₹" + totalRounded
  document.getElementById("totalSales").innerText = totalSales
  document.getElementById("monthlyEarnings").innerText = "₹" + Math.round(thisMonth)

  const balanceEl = document.getElementById("availableBalance")
  if (balanceEl) balanceEl.innerText = "₹" + availableBalance

  renderTransactions(data)
  renderMonthlyAnalytics(data)
  renderTopEvents(data)
  renderClientEarnings(data)
  renderProfitSplit(totalRounded, platformTotal)
}

// ===============================
// 💳 PAYOUT (🔥 VALIDATION FIX)
// ===============================

function setupPayout() {
  const btn = document.getElementById("withdrawBtn")
  if (!btn) return

  btn.addEventListener("click", requestPayout)
}

async function requestPayout() {

  if (!originalData.length) {
    alert("No earnings available")
    return
  }

  const totalRaw = originalData.reduce((sum, i) =>
    sum + (i.photographer_amount || 0), 0)

  const total = Math.round(totalRaw)

  try {

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("User not found")
      return
    }

    const { data: pendingData } = await supabase
      .from("payout_requests")
      .select("amount")
      .eq("photographer_id", user.id)
      .eq("status", "pending")

    const pendingTotal = (pendingData || []).reduce((s, r) => s + (r.amount || 0), 0)

    const available = Math.max(0, total - Math.round(pendingTotal))

    if (available < 500) {
      alert("Minimum withdrawal amount is ₹500")
      return
    }

    const { data: existing } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("photographer_id", user.id)
      .eq("status", "pending")

    if (existing && existing.length > 0) {
      alert("You already have a pending withdrawal request")
      return
    }

    const confirmWithdraw = confirm(`Withdraw ₹${available} ?`)
    if (!confirmWithdraw) return

    const res = await fetch(
      "https://gnnaaagvlrmdveqxicob.functions.supabase.co/create-withdraw-request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: available
        })
      }
    )

    const result = await res.json()

    if (!result.success) {
      alert(result.error || "Withdraw failed")
      return
    }

    alert(`Withdraw request submitted ₹${available} ✅`)

    await loadWithdrawStatus()
    await loadEarnings()

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

  btn.addEventListener("click", () => exportCSV(originalData))
}

function exportCSV(data) {

  if (!data || !data.length) return

  const rows = [
    ["Event", "Buyer", "Amount"],
    ...data.map(d => [
      eventsMap[String(d.event_id)] || "Event",
      d.buyer_name || "Guest",
      d.photographer_amount || 0
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
    const id = String(item.event_id)
    map[id] = (map[id] || 0) + (item.photographer_amount || 0)
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
      <div>₹${Math.round(item.photographer_amount || 0)}</div>
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
    const d = new Date(item.created_at)
    const key = `${d.getMonth()+1}/${d.getFullYear()}`
    months[key] = (months[key] || 0) + (item.photographer_amount || 0)
  })

  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(months),
      datasets: [{
        label: "Earnings",
        data: Object.values(months),
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
      <span class="text-green-400">₹${Math.round(item.photographer_amount || 0)}</span>
    </div>
  `).join("")
}

// ===============================
// PROFIT SPLIT
// ===============================

function renderProfitSplit(total, platformTotal) {

  const container = document.getElementById("profitSplit")
  if (!container) return

  container.innerHTML = `
    <div class="flex justify-between">
      <span>Photographer</span>
      <span class="text-green-400">₹${Math.round(total || 0)}</span>
    </div>
    <div class="flex justify-between">
      <span>Platform</span>
      <span class="text-yellow-400">₹${Math.round(platformTotal || 0)}</span>
    </div>
  `
}

// ===============================
init()