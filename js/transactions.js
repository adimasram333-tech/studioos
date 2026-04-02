// ===============================
// TRANSACTIONS MODULE (FULL)
// ===============================

let supabase = null
let eventsMap = {}

async function init() {

  supabase = await window.getSupabase()

  if (!supabase) {
    alert("Supabase not initialized")
    return
  }

  await loadEvents()
  await loadTransactions()
}

// ===============================
// LOAD EVENTS MAP
// ===============================

async function loadEvents() {

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
// LOAD TRANSACTIONS
// ===============================

async function loadTransactions() {

  try {

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert("User not logged in")
      return
    }

    const { data, error } = await supabase
      .from("image_purchases")
      .select("*")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      alert("Failed to load transactions")
      return
    }

    renderTransactions(data || [])

  } catch (err) {
    console.error(err)
    alert("Something went wrong")
  }
}

// ===============================
// RENDER
// ===============================

function renderTransactions(data) {

  const container = document.getElementById("transactionsList")

  if (!container) return

  if (!data.length) {
    container.innerHTML = `<p class="text-gray-400">No transactions found</p>`
    return
  }

  container.innerHTML = data.map(item => {

    return `
      <div class="glass p-3 rounded-xl">

        <div class="text-sm text-gray-300 mb-1">
          ${eventsMap[item.event_id] || "Event"}
        </div>

        <div class="text-sm">
          👤 ${item.buyer_name || "Guest"}
        </div>

        <div class="text-xs text-gray-400">
          💳 ${item.buyer_upi_id || "N/A"}
        </div>

        <div class="text-xs text-gray-400">
          🏦 ${item.buyer_upi_name || "N/A"}
        </div>

        <div class="flex justify-between mt-2">
          <span class="text-green-400 font-semibold">
            ₹${(item.photographer_amount || 0).toFixed(0)}
          </span>
          <span class="text-xs text-gray-500">
            ${new Date(item.created_at).toLocaleString()}
          </span>
        </div>

      </div>
    `
  }).join("")
}

// ===============================
init()