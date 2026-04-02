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
    data.forEach(e => {
      eventsMap[e.id] = e.event_name
      eventsClientMap[e.id] = e.client_name
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

  document.getElementById("totalEarnings").innerText = "₹" + total.toFixed(0)
  document.getElementById("totalSales").innerText = totalSales
  document.getElementById("monthlyEarnings").innerText = "₹" + thisMonth.toFixed(0)

  const balanceEl = document.getElementById("availableBalance")
  if (balanceEl) balanceEl.innerText = "₹" + total.toFixed(0)

  renderTransactions(data)
  renderMonthlyAnalytics(data)
  renderTopEvents(data)
  renderClientEarnings(data)
  renderProfitSplit(total, platformTotal)
}

// ===============================
// 💳 PAYOUT (FIXED PRO SAFE)
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

  // ✅ MIN LIMIT
  if (total < 500) {
    alert("Minimum withdrawal amount is ₹500")
    return
  }

  try {

    const { data: { user } } = await supabase.auth.getUser()

    // ✅ DUPLICATE CHECK
    const { data: existing } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("photographer_id", user.id)
      .eq("status", "pending")

    if (existing && existing.length > 0) {
      alert("You already have a pending withdrawal request")
      return
    }

    const { error } = await supabase
      .from("payout_requests")
      .insert([{
        photographer_id: user.id,
        amount: total,
        status: "pending"
      }])

    if (error) {
      console.error(error)
      alert("Payout request failed")
      return
    }

    alert(`
Your withdrawal request of ₹${total.toFixed(0)} has been submitted.
It will be processed within 5 hours.
`)

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
    ["Event", "Amount"],
    ...data.map(d => [
      eventsMap[d.event_id] || "Event",
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
    const id = item.event_id
    map[id] = (map[id] || 0) + (item.photographer_amount || 0)
  })

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  container.innerHTML = sorted.map(([id, amount]) => `
    <div class="flex justify-between">
      <span>${eventsMap[id] || "Event"}</span>
      <span class="text-green-400">₹${amount.toFixed(0)}</span>
    </div>
  `).join("")
}

// ===============================
// TRANSACTIONS (LAST 2)
// ===============================

function renderTransactions(data) {
  const container = document.getElementById("transactionsList")
  if (!container) return

  const last2 = data.slice(0, 2)

  container.innerHTML = last2.map(item => `
    <div onclick="window.location.href='transactions.html'"
         class="glass p-3 rounded-xl flex justify-between cursor-pointer">
      <div>
        <p class="text-sm text-gray-300">${eventsMap[item.event_id] || "Event"}</p>
        <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleString()}</p>
      </div>
      <div class="text-green-400">
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
    }
  })
}

// ===============================
// CLIENT (LAST 2)
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
    <div class="flex justify-between">
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