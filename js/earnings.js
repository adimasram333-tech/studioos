// ===============================
// EARNINGS LOGIC (PRO FINAL)
// ===============================

import { protectPage } from "./auth.js"

let supabase = null
let originalData = []
let chartInstance = null
let eventsMap = {} // ✅ event_id → name

async function init() {
  await protectPage()
  supabase = await window.getSupabase()

  await loadEventsMap() // ✅ fetch event names
  await loadEarnings()

  setupRealtime() // ✅ LIVE updates
  setupFilters()
  setupExport()
}

// ===============================
// LOAD EVENTS MAP
// ===============================

async function loadEventsMap() {
  const { data, error } = await supabase
    .from("events")
    .select("id, event_name")

  if (!error && data) {
    data.forEach(e => {
      eventsMap[e.id] = e.event_name
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

    originalData = data
    processAndRender(data)

  } catch {
    alert("Something went wrong")
  }
}

// ===============================
// REALTIME (LIVE UPDATE)
// ===============================

function setupRealtime() {
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

        originalData.unshift(payload.new) // add new data
        processAndRender(originalData)
      }
    )
    .subscribe()
}

// ===============================
// PROCESS
// ===============================

function processAndRender(data) {

  let total = 0
  let totalSales = data.length
  let thisMonth = 0
  let platformTotal = 0

  const now = new Date()

  data.forEach(item => {
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

  renderTransactions(data)
  renderMonthlyAnalytics(data)
  renderTopEvents(data)
  renderClientEarnings(data)
  renderProfitSplit(total, platformTotal)
}

// ===============================
// FILTERS
// ===============================

function setupFilters() {
  const dateInput = document.getElementById("filterDate")
  const eventInput = document.getElementById("filterEvent")

  if (!dateInput || !eventInput) return

  dateInput.addEventListener("change", applyFilters)
  eventInput.addEventListener("input", applyFilters)
}

function applyFilters() {
  const dateVal = document.getElementById("filterDate").value
  const eventVal = document.getElementById("filterEvent").value.toLowerCase()

  let filtered = [...originalData]

  if (dateVal) {
    filtered = filtered.filter(item => {
      const d = new Date(item.created_at).toISOString().split("T")[0]
      return d === dateVal
    })
  }

  if (eventVal) {
    filtered = filtered.filter(item =>
      (eventsMap[item.event_id] || "").toLowerCase().includes(eventVal)
    )
  }

  processAndRender(filtered)
}

// ===============================
// EXPORT
// ===============================

function setupExport() {
  const btn = document.getElementById("exportBtn")
  if (!btn) return

  btn.addEventListener("click", exportCSV)
}

function exportCSV() {

  if (!originalData.length) return

  const rows = [["Date", "Event", "Amount"]]

  originalData.forEach(item => {
    rows.push([
      new Date(item.created_at).toLocaleString(),
      eventsMap[item.event_id] || "Event",
      item.photographer_amount || 0
    ])
  })

  const csv = rows.map(r => r.join(",")).join("\n")

  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = "earnings.csv"
  a.click()

  URL.revokeObjectURL(url)
}

// ===============================
// TRANSACTIONS
// ===============================

function renderTransactions(data) {
  const container = document.getElementById("transactionsList")

  if (!data.length) {
    container.innerHTML = `<p class="text-gray-400">No earnings yet</p>`
    return
  }

  container.innerHTML = data.map(item => `
    <div class="glass p-3 rounded-xl flex justify-between items-center">
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
// 📊 ANIMATED GRAPH
// ===============================

function renderMonthlyAnalytics(data) {

  const months = {}

  data.forEach(item => {
    const d = new Date(item.created_at)
    const key = `${d.getMonth()+1}/${d.getFullYear()}`
    months[key] = (months[key] || 0) + (item.photographer_amount || 0)
  })

  const ctx = document.getElementById("monthlyChart")
  if (!ctx) return

  if (chartInstance) chartInstance.destroy() // ✅ fix duplicate

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
      animation: {
        duration: 1000
      }
    }
  })
}

// ===============================
// TOP EVENTS (NAME FIXED)
// ===============================

function renderTopEvents(data) {
  const container = document.getElementById("topEvents")
  if (!container) return

  const events = {}

  data.forEach(item => {
    const name = eventsMap[item.event_id] || "Event"
    events[name] = (events[name] || 0) + item.photographer_amount
  })

  const sorted = Object.entries(events)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  container.innerHTML = sorted.map(([name, amt]) => `
    <div class="flex justify-between">
      <span>${name}</span>
      <span class="text-green-400">₹${amt.toFixed(0)}</span>
    </div>
  `).join("")
}

// ===============================
// CLIENT
// ===============================

function renderClientEarnings(data) {
  const container = document.getElementById("clientEarnings")
  if (!container) return

  const clients = {}

  data.forEach(item => {
    const id = item.visitor_id || "Client"
    clients[id] = (clients[id] || 0) + item.photographer_amount
  })

  const sorted = Object.entries(clients)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  container.innerHTML = sorted.map(([id, amt]) => `
    <div class="flex justify-between">
      <span>Client</span>
      <span class="text-green-400">₹${amt.toFixed(0)}</span>
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