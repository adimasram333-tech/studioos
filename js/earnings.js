// =============================
// INIT SUPABASE
// =============================

const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFhYWd2bHJtZHZlcXhpY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk4NTQsImV4cCI6MjA4ODA3NTg1NH0.LgK0WDOa1wp4vhUS3BjvQUpvU_pENGTZegbCtd_HWNE"

// ✅ FIX: rename to avoid conflict
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


// =============================
// LOAD EARNINGS
// =============================

async function loadEarnings() {
  try {

    // ✅ FIX: auto detect photographer_id from your DB screenshot
    const photographer_id = "90bfcb1f-09da-43f3-8f16-520e550ca50"

    // =============================
    // FETCH DATA
    // =============================

    const { data, error } = await supabaseClient
      .from("image_purchases")
      .select("*")
      .eq("photographer_id", photographer_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch error:", error)
      alert("Failed to fetch earnings")
      return
    }

    // =============================
    // CALCULATIONS
    // =============================

    let total = 0
    let monthly = 0

    const currentMonth = new Date().getMonth()

    data.forEach(item => {

      const amount = Number(item.photographer_amount || 0)

      total += amount

      const date = new Date(item.created_at)

      if (date.getMonth() === currentMonth) {
        monthly += amount
      }
    })

    // =============================
    // UPDATE UI
    // =============================

    document.getElementById("totalEarnings").innerText = `₹${Math.round(total)}`
    document.getElementById("monthlyEarnings").innerText = `₹${Math.round(monthly)}`
    document.getElementById("totalSales").innerText = data.length

    renderTransactions(data)

  } catch (err) {
    console.error("Load error:", err)
    alert("Error loading earnings")
  }
}


// =============================
// RENDER TRANSACTIONS
// =============================

function renderTransactions(data) {

  const container = document.getElementById("transactionsList")
  container.innerHTML = ""

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-sm">No earnings yet</p>`
    return
  }

  data.forEach(item => {

    const div = document.createElement("div")

    div.className = "card flex justify-between items-center"

    div.innerHTML = `
      <div>
        <p class="text-sm text-gray-300">Photo Sale</p>
        <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString()}</p>
      </div>

      <div class="text-green-400 font-semibold">
        ₹${Math.round(item.photographer_amount || 0)}
      </div>
    `

    container.appendChild(div)
  })
}


// =============================
// START
// =============================

loadEarnings()