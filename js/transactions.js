// ===============================
// TRANSACTIONS MODULE (FULL)
// ===============================

let supabase = null
let eventsMap = {}
let visitorsMap = {} // ✅ NEW

async function init() {

  supabase = await window.getSupabase()

  if (!supabase) {
    alert("Supabase not initialized")
    return
  }

  await loadEvents()
  await loadVisitors() // ✅ NEW
  await loadTransactions()
}

// ===============================
// LOAD EVENTS MAP (FIXED)
// ===============================

async function loadEvents() {

  const { data, error } = await supabase
    .from("events")
    .select("id, event_name")

  if (!error && data) {
    data.forEach(e => {
      const key = String(e.id).trim() // ✅ FIX
      eventsMap[key] = e.event_name || "Event"
    })
  }
}

// ===============================
// LOAD VISITORS MAP (NEW)
// ===============================

async function loadVisitors() {

  const { data, error } = await supabase
    .from("event_visitors")
    .select("id, phone")

  if (!error && data) {
    data.forEach(v => {
      const key = String(v.id).trim()
      visitorsMap[key] = v.phone || ""
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
// RENDER (FIXED)
// ===============================

function escapeTransactionText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatTransactionAmount(value) {
  const amount = Number(value || 0)

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(amount)
}

function formatTransactionDate(value) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

function formatTransactionTime(value) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  })
}

function getTransactionInitials(name) {
  const cleanName = String(name || "Guest").trim()

  return cleanName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "G"
}

// ===============================
// RENDER (PREMIUM UI ONLY)
// ===============================

function renderTransactions(data) {

  const container = document.getElementById("transactionsList")

  if (!container) return

  if (!data.length) {
    container.innerHTML = `
      <div class="glass rounded-2xl p-6 text-center border border-white/10">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl">💳</div>
        <p class="text-base font-semibold text-white">No transactions found</p>
        <p class="mt-1 text-sm text-slate-400">Your paid photo downloads will appear here.</p>
      </div>
    `
    return
  }

  container.innerHTML = data.map(item => {

    // ✅ FIX: normalize event_id
    const eventKey = String(item.event_id).trim()
    const eventName = eventsMap[eventKey] || "Event"

    // ✅ NEW: visitor phone
    const visitorKey = String(item.visitor_id || "").trim()
    const phone = visitorsMap[visitorKey] || "No Phone"

    const buyerName = item.buyer_name || "Guest"
    const buyerUpi = item.buyer_upi_id || "N/A"
    const buyerUpiName = item.buyer_upi_name || "N/A"
    const amount = formatTransactionAmount(item.photographer_amount)
    const date = formatTransactionDate(item.created_at)
    const time = formatTransactionTime(item.created_at)
    const initials = getTransactionInitials(buyerName)

    return `
      <article class="glass relative overflow-hidden rounded-3xl border border-white/10 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
        <div class="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl"></div>

        <div class="relative flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span class="h-1.5 w-1.5 flex-none rounded-full bg-emerald-400"></span>
              <span class="truncate text-xs font-semibold tracking-wide text-slate-300">
                ${escapeTransactionText(eventName)}
              </span>
            </div>

            <div class="mt-4 flex items-center gap-3">
              <div class="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/85 to-cyan-400/80 text-sm font-black text-white shadow-lg shadow-sky-500/20">
                ${escapeTransactionText(initials)}
              </div>

              <div class="min-w-0">
                <div class="truncate text-base font-bold text-white">
                  ${escapeTransactionText(buyerName)}
                </div>
                <div class="mt-0.5 truncate text-sm text-slate-400">
                  ${escapeTransactionText(phone)}
                </div>
              </div>
            </div>
          </div>

          <div class="shrink-0 text-right">
            <div class="text-xl font-black text-emerald-400">
              ₹${escapeTransactionText(amount)}
            </div>
            <div class="mt-1 text-[11px] font-medium text-slate-500">
              ${escapeTransactionText(date)}
            </div>
            <div class="text-[11px] text-slate-500">
              ${escapeTransactionText(time)}
            </div>
          </div>
        </div>

        <div class="relative mt-4 grid grid-cols-1 gap-2 border-t border-white/10 pt-3">
          <div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/20 px-3 py-2">
            <span class="text-xs font-medium text-slate-400">UPI ID</span>
            <span class="min-w-0 truncate text-right text-xs font-semibold text-slate-200">
              ${escapeTransactionText(buyerUpi)}
            </span>
          </div>

          <div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/20 px-3 py-2">
            <span class="text-xs font-medium text-slate-400">UPI Name</span>
            <span class="min-w-0 truncate text-right text-xs font-semibold text-slate-200">
              ${escapeTransactionText(buyerUpiName)}
            </span>
          </div>
        </div>
      </article>
    `
  }).join("")
}

// ===============================
init()