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
// UUID VALIDATOR (ADDED FIX)
// ===============================

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
}

// ===============================
// LOAD EARNINGS (FIXED)
// ===============================

async function loadEarnings() {
  try {

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

    console.log("Photographer ID:", photographer_id)

    if (!photographer_id || !isValidUUID(photographer_id)) {
      console.error("Invalid UUID:", photographer_id)
      alert("Invalid user ID")
      return
    }

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
    // SAFE UI UPDATE (FINAL FIX)
    // ===============================

    const totalEl = document.getElementById("totalEarnings")
    const salesEl = document.getElementById("totalSales")
    const monthEl = document.getElementById("monthlyEarnings") // ✅ FIXED ID

    if (totalEl) totalEl.innerText = "₹" + total.toFixed(0)
    if (salesEl) salesEl.innerText = totalSales
    if (monthEl) monthEl.innerText = "₹" + thisMonth.toFixed(0)

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

  if (!container) return

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