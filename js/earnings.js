// ===============================
// EARNINGS LOGIC (PRO FINAL SAFE FIX)
// ===============================

import { protectPage } from "./auth.js"

let supabase = null
let originalData = []
let chartInstance = null
let eventsMap = {}
let eventsClientMap = {}

// 🔥 NEW (MODAL DATA)
let withdrawData = null

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
// 💳 PAYOUT (🔥 MODAL FIX)
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

    // 🔥 FETCH PROFILE
    const { data: profile } = await supabase
      .from("photographer_settings")
      .select("owner_name, upi")
      .eq("user_id", user.id)
      .single()

    if (!profile || !profile.upi) {
      alert("Please set your UPI ID in profile first")
      window.location.href = "profile.html"
      return
    }

    // 🔥 SAVE DATA FOR MODAL
    withdrawData = {
      user_id: user.id,
      amount: available,
      upi: profile.upi,
      name: profile.owner_name || "Not Set"
    }

    // 🔥 FILL MODAL
    document.getElementById("modalName").innerText = withdrawData.name
    document.getElementById("modalUpi").innerText = withdrawData.upi
    document.getElementById("modalAmount").innerText = withdrawData.amount

    // 🔥 SHOW MODAL
    document.getElementById("withdrawModal").classList.remove("hidden")

  } catch (err) {
    console.error(err)
    alert("Something went wrong")
  }
}

// ===============================
// 🔥 MODAL FUNCTIONS
// ===============================

function closeWithdrawModal() {
  document.getElementById("withdrawModal").classList.add("hidden")
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

    await loadWithdrawStatus()
    await loadEarnings()

  } catch (err) {
    console.error(err)
    alert("Something went wrong")
  }
}

// ===============================
init()