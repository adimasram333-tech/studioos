// ===============================
// EARNINGS LOGIC (FIXED + FULL UI)
// ===============================

import { protectPage } from "./auth.js"

let supabase = null

async function init() {
  await protectPage()
  supabase = await window.getSupabase()
  loadEarnings()
}

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
}

// ===============================
// MAIN
// ===============================

async function loadEarnings() {
  try {

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      alert("User not found")
      return
    }

    const photographer_id = user.id

    if (!photographer_id || !isValidUUID(photographer_id)) {
      alert("Invalid user ID")
      return
    }

    const { data, error } = await supabase
      .from("image_purchases")
      .select("*")
      .eq("photographer_id", photographer_id)

    if (error) {
      alert("Failed to fetch earnings")
      return
    }

    // ===============================
    // CALC
    // ===============================

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

    // ===============================
    // UI UPDATE
    // ===============================

    document.getElementById("totalEarnings").innerText = "₹" + total.toFixed(0)
    document.getElementById("totalSales").innerText = totalSales
    document.getElementById("monthlyEarnings").innerText = "₹" + thisMonth.toFixed(0)

    renderTransactions(data)

    renderMonthlyAnalytics(data)
    renderTopEvents(data)
    renderClientEarnings(data)
    renderProfitSplit(total, platformTotal)

  } catch (err) {
    console.error(err)
    alert("Something went wrong")
  }
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
        <p class="text-sm text-gray-300">Image Purchase</p>
        <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleString()}</p>
      </div>
      <div class="text-green-400 font-semibold">
        ₹${(item.photographer_amount || 0).toFixed(0)}
      </div>
    </div>
  `).join("")
}

// ===============================
// 📊 MONTHLY GRAPH
// ===============================

function renderMonthlyAnalytics(data) {

  const months = {}

  data.forEach(item => {
    const d = new Date(item.created_at)
    const key = `${d.getMonth()+1}/${d.getFullYear()}`
    months[key] = (months[key] || 0) + (item.photographer_amount || 0)
  })

  const labels = Object.keys(months)
  const values = Object.values(months)

  const ctx = document.getElementById("monthlyChart")

  if (!ctx) return

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Earnings",
        data: values,
        borderWidth: 2
      }]
    }
  })
}

// ===============================
// 🏆 TOP EVENTS UI
// ===============================

function renderTopEvents(data) {
  const container = document.getElementById("topEvents")
  if (!container) return

  const events = {}

  data.forEach(item => {
    const id = item.event_id || "unknown"
    events[id] = (events[id] || 0) + item.photographer_amount
  })

  const sorted = Object.entries(events)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  container.innerHTML = sorted.map(([id, amt]) => `
    <div class="flex justify-between">
      <span>Event</span>
      <span class="text-green-400">₹${amt.toFixed(0)}</span>
    </div>
  `).join("")
}

// ===============================
// 👤 CLIENT UI
// ===============================

function renderClientEarnings(data) {
  const container = document.getElementById("clientEarnings")
  if (!container) return

  const clients = {}

  data.forEach(item => {
    const id = item.visitor_id || "unknown"
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
// 💰 PROFIT SPLIT UI
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
// START
// ===============================

init()