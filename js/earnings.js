// ===============================
// EARNINGS LOGIC (FIXED)
// ===============================

import { protectPage } from "./auth.js"

let supabase = null

// ===============================
// INIT
// ===============================

async function init() {
  await protectPage()

  supabase = await window.getSupabase()

  loadEarnings()
}

// ===============================
// LOAD EARNINGS (FIXED)
// ===============================

async function loadEarnings() {
  try {

    // ✅ ALWAYS GET LOGGED IN USER (NO MANUAL ID)
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("User error:", userError)
      alert("User not found")
      return
    }

    const photographer_id = user.id

    // 🔥 DEBUG (IMPORTANT)
    console.log("Photographer ID:", photographer_id)

    // ===============================
    // FETCH PURCHASES
    // ===============================

    const { data, error } = await supabase
      .from("image_purchases")
      .select("*")
      .eq("photographer_id", photographer_id)

    if (error) {
      console.error("Fetch error:", error)
      alert("Failed to fetch earnings")
      return
    }

    // ===============================
    // CALCULATIONS
    // ===============================

    let total = 0
    let totalSales = data.length

    const now = new Date()
    let thisMonth = 0

    data.forEach(item => {
      total += item.photographer_amount || 0

      const created = new Date(item.created_at)

      if (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      ) {
        thisMonth += item.photographer_amount || 0
      }
    })

    // ===============================
    // UPDATE UI
    // ===============================

    document.getElementById("totalEarnings").innerText = "₹" + total.toFixed(0)
    document.getElementById("totalSales").innerText = totalSales
    document.getElementById("thisMonth").innerText = "₹" + thisMonth.toFixed(0)

    renderTransactions(data)

  } catch (err) {
    console.error("Fatal error:", err)
    alert("Something went wrong")
  }
}

// ===============================
// RENDER TRANSACTIONS
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
// START
// ===============================

init()