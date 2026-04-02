// ===============================
// EARNINGS LOGIC (PRO FINAL SAFE FIX)
// ===============================

import { protectPage } from "./auth.js"

let supabase = null
let originalData = []
let chartInstance = null
let eventsMap = {}
let eventsClientMap = {} // ✅ NEW (client name mapping)

async function init() {
  await protectPage()

  supabase = await window.getSupabase()
  if (!supabase) {
    alert("Supabase not initialized")
    return
  }

  await loadEventsMap()
  await loadEarnings()

  setupRealtime()
  setupExport()
  setupPayout() // 💳 NEW
}

// ===============================
// LOAD EVENTS MAP
// ===============================

async function loadEventsMap() {
  const { data, error } = await supabase
    .from("events")
    .select("id, event_name, client_name") // ✅ updated

  if (!error && data) {
    data.forEach(e => {
      eventsMap[e.id] = e.event_name
      eventsClientMap[e.id] = e.client_name // ✅ NEW
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
// REALTIME (SAFE)
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
// PROCESS
// ===============================

function processAndRender(data) {

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

  const totalEl = document.getElementById("totalEarnings")
  const salesEl = document.getElementById("totalSales")
  const monthEl = document.getElementById("monthlyEarnings")
  const balanceEl = document.getElementById("availableBalance") // 💳

  if (totalEl) totalEl.innerText = "₹" + total.toFixed(0)
  if (salesEl) salesEl.innerText = totalSales
  if (monthEl) monthEl.innerText = "₹" + thisMonth.toFixed(0)
  if (balanceEl) balanceEl.innerText = "₹" + total.toFixed(0)

  renderTransactions(data)
  renderMonthlyAnalytics(data)
  renderTopEvents(data)
  renderClientEarnings(data)
  renderProfitSplit(total, platformTotal)
}

// ===============================
// 💳 PAYOUT SYSTEM
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

  const total = originalData.reduce((sum, i) =>
    sum + (i.photographer_amount || 0), 0)

  if (total <= 0) {
    alert("No withdrawable balance")
    return
  }

  try {

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("payout_requests")
      .insert([{
        photographer_id: user.id,
        amount: total,
        status: "pending"
      }])

    if (error) {
      alert("Payout request failed")
      return
    }

    alert("Withdrawal request submitted ✅")

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

  btn.addEventListener("click", exportCSV)
}

// ===============================
// TRANSACTIONS (ONLY LAST 2 + CLICK)
// ===============================

function renderTransactions(data) {
  const container = document.getElementById("transactionsList")
  if (!container) return

  if (!data.length) {
    container.innerHTML = `<p class="text-gray-400">No earnings yet</p>`
    return
  }

  const last2 = data.slice(0, 2) // ✅ ONLY 2

  container.innerHTML = last2.map(item => `
    <div onclick="window.location.href='transactions.html'"
         class="glass p-3 rounded-xl flex justify-between items-center cursor-pointer">
      <div>
        <p class="text-sm text-gray-300">${eventsMap[item.event_id] || "Event"}</p>
        <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleString()}</p>
      </div>
      <div class="text-green-400 font-semibold">
        ₹${(item.photographer_amount || 0).toFixed(0)}
      </div>
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
    },
    options: {
      animation: { duration: 1000 }
    }
  })
}

// ===============================
// CLIENT (ONLY LAST 2 + NAME FIX)
// ===============================

function renderClientEarnings(data) {
  const container = document.getElementById("clientEarnings")
  if (!container) return

  const last2 = data.slice(0, 2)

  container.innerHTML = last2.map(item => `
    <div class="flex justify-between">
      <span>${eventsClientMap[item.event_id] || "Client"}</span>
      <span class="text-green-400">₹${(item.photographer_amount || 0).toFixed(0)}</span>
    </div>
  `).join("")
}

// ===============================
// PROFIT
// ===============================

function renderProfitSplit(total, platformTotal) {
  const container = document.getElementById("profitSplit")
  if (!container) return

  container.innerHTML = `
    <div class="flex justify-between mb-1">
      <span>Photographer</span>
      <span class="text-green-400">₹${total.toFixed(0)}</span>
    </div>
    <div class="flex justify-between">
      <span>Platform</span>
      <span class="text-yellow-400">₹${platformTotal.toFixed(0)}</span>
    </div>
  `
}

// ===============================
init()