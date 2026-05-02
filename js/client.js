// =============================
// GET CURRENT USER
// =============================

async function getCurrentUser(){

const supabase = await window.getSupabase()

const { data:{ user } } =
await supabase.auth.getUser()

return user

}



// =============================
// GET QUOTATION ID FROM URL
// =============================

function getQuotationId(){

const params =
new URLSearchParams(window.location.search)

return params.get("quotation") || params.get("id")

}



// =============================
// FORMAT DATE
// =============================

function formatDate(dateString){

if(!dateString) return "-"

const date = new Date(dateString)

return date.toLocaleDateString("en-IN",{
day:"numeric",
month:"short",
year:"numeric"
})

}



// =============================
// TEAM SHARE PLAN GATE
// =============================

function normalizePlanValue(value){

return String(value || "").trim().toLowerCase()

}

function isActivePaidTeamSharePlan(settings){

if(!settings) return false

const plan = normalizePlanValue(settings.plan)
const status = normalizePlanValue(settings.subscription_status)
const isPaid = settings.is_paid === true
const expiresAt = settings.plan_expires_at ? new Date(settings.plan_expires_at).getTime() : 0
const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now()

return isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro")

}

async function canCurrentUserShareTeam(supabase,userId){

if(!userId) return false

try{

const { data, error } =
await supabase
.from("photographer_settings")
.select("plan, subscription_status, is_paid, plan_expires_at")
.eq("user_id",userId)
.maybeSingle()

if(error){
console.error("TEAM SHARE PLAN CHECK ERROR:", error)
return false
}

return isActivePaidTeamSharePlan(data)

}catch(err){
console.error("TEAM SHARE PLAN CHECK ERROR:", err)
return false
}

}

function closeTeamShareUpgradeModal(){

const existing = document.getElementById("teamShareUpgradeModal")

if(existing){
existing.remove()
}

document.body.classList.remove("overflow-hidden")

}

function showTeamShareUpgradeModal(){

closeTeamShareUpgradeModal()

const modal = document.createElement("div")
modal.id = "teamShareUpgradeModal"
modal.className = "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"

modal.innerHTML = `
  <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] p-5 text-white shadow-2xl">
    <div class="inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-200">
      Basic / Pro Required
    </div>

    <h2 class="mt-4 text-xl font-bold">
      Unlock team sharing
    </h2>

    <div class="mt-3 space-y-2 text-sm text-gray-300">
      <p>• Share Team Sheet link</p>
      <p>• Client/public team sheet access</p>
      <p>• Team Sheet PDF sharing</p>
    </div>

    <div class="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
      <div class="text-sm font-semibold">Basic Plan</div>
      <div class="mt-1 text-2xl font-bold">₹499/mo</div>
      <p class="mt-2 text-xs text-gray-400">
        Upgrade to enable team sharing.
      </p>
    </div>

    <div class="mt-5 grid grid-cols-2 gap-3">
      <button
        type="button"
        id="teamShareUpgradeCancel"
        class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
        Cancel
      </button>

      <button
        type="button"
        id="teamShareUpgradePlans"
        class="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
        View Plans
      </button>
    </div>
  </div>
`

document.body.appendChild(modal)
document.body.classList.add("overflow-hidden")

const cancelBtn = document.getElementById("teamShareUpgradeCancel")
const plansBtn = document.getElementById("teamShareUpgradePlans")

if(cancelBtn){
cancelBtn.onclick = closeTeamShareUpgradeModal
}

if(plansBtn){
plansBtn.onclick = function(){
window.location.href = "subscription.html"
}
}

modal.addEventListener("click",function(e){
if(e.target === modal){
closeTeamShareUpgradeModal()
}
})

}



// =============================
// LOAD CLIENT PROFILE
// =============================

async function loadClient(){

try{

const supabase = await window.getSupabase()

const quotationId = getQuotationId()

if(!quotationId) {
console.warn("No quotationId found")
return
}



// =============================
// GET QUOTATION
// =============================

const { data: quote, error } =
await supabase
.from("quotations")
.select("*")
.eq("id",quotationId)
.single()

if(error){
console.error("QUOTE ERROR:", error)
return
}

if(!quote) return

const currentUser = await getCurrentUser()
const currentUserId = currentUser?.id || ""
const quotationOwnerId = quote.user_id || currentUserId



// =============================
// CLIENT DETAILS
// =============================

document.getElementById("clientName").innerText =
quote.client_name || "-"

document.getElementById("clientPhone").innerText =
quote.phone || "-"



// =============================
// EVENT DETAILS
// =============================

const eventType =
quote.event_category ||
quote.event_type ||
quote.package ||
"-"

document.getElementById("eventType").innerText =
eventType



// =============================
// EVENT DATE
// =============================

const startDate =
quote.event_start_date ||
quote.event_date

const endDate =
quote.event_end_date ||
quote.end_date ||
quote.event_date



let eventDateText =
formatDate(startDate)

if(endDate && startDate !== endDate){

eventDateText =
formatDate(startDate) + " → " + formatDate(endDate)

}

document.getElementById("eventDate").innerText =
eventDateText

document.getElementById("eventVenue").innerText =
quote.venue || "-"



// =============================
// TOTAL PACKAGE
// =============================

const total =
Number(quote.total || 0)

document.getElementById("totalAmount").innerText =
"₹" + total



// =============================
// GET PAYMENTS
// =============================

const { data: payments } =
await supabase
.from("payments")
.select("*")
.eq("quotation_id", quotationId)
.order("payment_date",{ascending:true})


const container =
document.getElementById("paymentsList")

let paid = 0


if(!payments || payments.length === 0){

container.innerHTML =
"<p class='text-gray-400'>No payments yet</p>"

}else{

container.innerHTML = ""

payments.forEach(p=>{

paid += Number(p.amount || 0)

const row =
document.createElement("div")

row.className =
"flex justify-between"

row.innerHTML = `
<div>
₹${p.amount}
<div class="text-xs text-gray-400">
${p.payment_type} • ${p.method}
</div>
</div>

<div class="text-xs text-gray-400">
${formatDate(p.payment_date)}
</div>
`

container.appendChild(row)

})

}



// =============================
// PAID + BALANCE
// =============================

document.getElementById("paidAmount").innerText =
"₹" + paid

document.getElementById("balanceAmount").innerText =
"₹" + (total - paid)



// =============================
// BUTTON LINKS
// =============================

document.getElementById("addPaymentBtn").href =
"payment.html?quotation=" + quotationId

document.getElementById("viewInvoiceBtn").href =
"invoice.html?quotation=" + quotationId

const addTeamBtn = document.getElementById("addTeamBtn")

if(addTeamBtn){
addTeamBtn.href =
"team.html?quotation=" + quotationId
}



// =============================
// MENU LOGIC
// =============================

const menuBtn = document.getElementById("menuBtn")
const menuDropdown = document.getElementById("menuDropdown")

if(menuBtn && menuDropdown){

menuBtn.onclick = (e)=>{
e.stopPropagation()
menuDropdown.classList.toggle("hidden")
}

menuDropdown.onclick = (e)=>{
e.stopPropagation()
}

document.addEventListener("click",()=>{
menuDropdown.classList.add("hidden")
})

}



// =============================
// MENU ACTIONS
// =============================

const openTeamBtn = document.getElementById("openTeamBtn")
const viewTeamSheetBtn = document.getElementById("viewTeamSheetBtn")
const shareTeamBtn = document.getElementById("shareTeamBtn")
const backBtn = document.getElementById("backBtn")

if(openTeamBtn){
openTeamBtn.onclick = ()=>{
window.location.href =
"team.html?quotation=" + quotationId
}
}

if(viewTeamSheetBtn){
viewTeamSheetBtn.onclick = ()=>{
window.location.href =
"team-sheet.html?quotation=" + quotationId
}
}

if(shareTeamBtn){
shareTeamBtn.onclick = async ()=>{
try{

const canShareTeam =
await canCurrentUserShareTeam(supabase, quotationOwnerId)

if(!canShareTeam){
showTeamShareUpgradeModal()
return
}

const url =
window.location.origin +
"/studioos/team-sheet.html?quotation=" +
quotationId

if(navigator.share){
await navigator.share({
title:"Team Sheet",
url:url
})
}else if(navigator.clipboard && navigator.clipboard.writeText){
await navigator.clipboard.writeText(url)
console.log("Team sheet link copied")
}else{
console.warn("Clipboard API not supported")
}
}catch(err){
console.error("SHARE TEAM ERROR:", err)
}
}
}

if(backBtn){
backBtn.onclick = ()=>{
window.location.href = "clients.html"
}
}

}catch(err){
console.error("LOAD CLIENT ERROR:", err)
}

}



// =============================
// INIT (SAFE)
// =============================

window.addEventListener("DOMContentLoaded",()=>{
loadClient()
})