// =============================
// INIT SUPABASE
// =============================

const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFhYWd2bHJtZHZlcXhpY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk4NTQsImV4cCI6MjA4ODA3NTg1NH0.LgK0WDOa1wp4vhUS3BjvQUpvU_pENGTZegbCtd_HWNE"

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// =============================
// GET USER (Photographer)
// =============================

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id
}

// =============================
// LOAD EARNINGS
// =============================

async function loadEarnings() {
  try {

    const photographer_id = await getUserId()

    if (!photographer_id) {
      alert("User not logged in")
      return
    }

    // =============================
    // FETCH DATA
    // =============================

    const { data, error } = await supabase
      .from("image_purchases")
      .select("*")
      .eq("photographer_id", photographer_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    // =============================
    // CALCULATIONS
    // =============================

    let total = 0
    let monthly = 0

    const currentMonth = new Date().getMonth()

    data.forEach(item => {
      total += item.photographer_amount

      const date = new Date(item.created_at)
      if (date.getMonth() === currentMonth) {
        monthly += item.photographer_amount
      }
    })

    // =============================
    // UPDATE UI
    // =============================

    document.getElementById("totalEarnings").innerText = `₹${total.toFixed(0)}`
    document.getElementById("monthlyEarnings").innerText = `₹${monthly.toFixed(0)}`
    document.getElementById("totalSales").innerText = data.length

    renderTransactions(data)

  } catch (err) {
    console.error(err)
    alert("Error loading earnings")
  }
}

// =============================
// RENDER TRANSACTIONS
// =============================

function renderTransactions(data) {

  const container = document.getElementById("transactionsList")
  container.innerHTML = ""

  data.forEach(item => {

    const div = document.createElement("div")

    div.className = "card flex justify-between items-center"

    div.innerHTML = `
      <div>
        <p class="text-sm text-gray-300">Photo Sale</p>
        <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString()}</p>
      </div>

      <div class="text-green-400 font-semibold">
        ₹${item.photographer_amount}
      </div>
    `

    container.appendChild(div)
  })
}

// =============================
// START
// =============================

loadEarnings()