// =============================
// SAFE SUPABASE ACCESS
// =============================

function getSupabase(){

// use global helper if available
if(window.getSupabase && window.getSupabase !== getSupabase){
return window.getSupabase()
}

if(window.supabaseClient){
return window.supabaseClient
}

throw new Error("Supabase client not initialized")

}

async function getCurrentUser(){

// prevent recursion
if(window.getCurrentUser && window.getCurrentUser !== getCurrentUser){
return await window.getCurrentUser()
}

const supabase = getSupabase()

const { data:{ user } } =
await supabase.auth.getUser()

return user

}



// =============================
// ANDROID SAFE PROPOSAL ROUTING
// =============================

function isStudioOSNativeApp(){

try{

if(
window.Capacitor &&
typeof window.Capacitor.isNativePlatform === "function" &&
window.Capacitor.isNativePlatform()
){
return true
}

const protocol = String(window.location.protocol || "").toLowerCase()
return protocol === "capacitor:" || protocol === "file:"

}catch(error){

return false

}

}

function getStudioOSPublicBaseUrl(){

const configuredUrl = String(window.STUDIOOS_PUBLIC_BASE_URL || "").trim()

if(configuredUrl){
return configuredUrl.replace(/\/+$/,"")
}

return "https://app.chitrabookai.in"

}

function slugifyQuotationClientName(value){

return String(value || "client")
.toLowerCase()
.trim()
.replace(/[^a-z0-9 ]/g,"")
.replace(/\s+/g,"-")
.replace(/-+/g,"-")
.replace(/^-|-$/g,"") || "client"

}

function buildQuotationProposalSlug(quotation){

const slug = slugifyQuotationClientName(quotation?.client_name || "client")
const shortId = quotation?.short_id || String(quotation?.id || "").substring(0,8)

return slug + "-" + shortId

}

function buildQuotationProposalViewUrl(quotation){

const proposalSlug = buildQuotationProposalSlug(quotation)

if(isStudioOSNativeApp()){
return "proposal.html?id=" + encodeURIComponent(quotation.id) + "&slug=" + encodeURIComponent(proposalSlug)
}

return getStudioOSPublicBaseUrl() + "/p/" + proposalSlug

}

function openProposalFromQuotation(quotation){

if(!quotation || !quotation.id){
console.error("Invalid quotation for proposal view:", quotation)
return
}

try{
if(window.StudioOSAppShell && typeof window.StudioOSAppShell.rememberCurrentInternalPage === "function"){
window.StudioOSAppShell.rememberCurrentInternalPage()
}
}catch(error){
console.warn("Navigation history remember skipped:", error)
}

window.location.href = buildQuotationProposalViewUrl(quotation)

}



// =============================
// MENU STATE
// =============================

let activeQuotationMenuId = null
let quotationMenuListenersInitialized = false
let loadedQuotationMap = new Map()

const QUOTATION_INR_SYMBOL = "\u20B9"
const QUOTATION_MENU_ICON = "\u22EE"

function closeAllMenus(exceptId = null){

const allMenus = document.querySelectorAll('[id^="menu-"]')

allMenus.forEach((menu)=>{
if(menu.id !== exceptId){
menu.classList.add("hidden")
}
})

if(exceptId){
activeQuotationMenuId = exceptId.replace("menu-","")
}else{
activeQuotationMenuId = null
}

}

function initializeQuotationMenuListeners(){

if(quotationMenuListenersInitialized) return

document.addEventListener("click", function(e){

const clickedToggle =
e.target.closest("[data-quotation-menu-toggle='true']")

const clickedMenu =
e.target.closest("[data-quotation-menu='true']")

if(clickedToggle || clickedMenu){
return
}

closeAllMenus()

})

document.addEventListener("touchstart", function(e){

const clickedToggle =
e.target.closest("[data-quotation-menu-toggle='true']")

const clickedMenu =
e.target.closest("[data-quotation-menu='true']")

if(clickedToggle || clickedMenu){
return
}

closeAllMenus()

}, { passive:true })

quotationMenuListenersInitialized = true

}



// =============================
// FETCH QUOTATIONS
// =============================

async function getAllQuotations(){

const user = await getCurrentUser()

if(!user) return []

const supabase = getSupabase()

const { data, error } =
await supabase
.from("quotations")
.select("*")
.eq("user_id",user.id)
.order("created_at",{ascending:false})

if(error){

console.error("Fetch error:",error)
return []

}

return data

}



// =============================
// LOAD QUOTATIONS
// =============================

async function loadQuotations(){

const listContainer =
document.getElementById("quotationList")

if(!listContainer) return

initializeQuotationMenuListeners()
closeAllMenus()

listContainer.innerHTML =
"<p class='text-gray-400 text-sm'>Loading quotations...</p>"

const quotations = await getAllQuotations()

loadedQuotationMap = new Map()
;(quotations || []).forEach((quotation)=>{
if(quotation?.id){
loadedQuotationMap.set(String(quotation.id), quotation)
}
})

if(!quotations || quotations.length === 0){

listContainer.innerHTML =
"<p class='text-gray-400 text-sm'>No quotations found.</p>"

return

}

listContainer.innerHTML = ""

quotations.forEach((q)=>{

const card = document.createElement("div")

card.className = "glass p-4 rounded-xl relative"

// ===== CONFIRM BUTTON STATE =====

let confirmOption = ""

if(q.status === "confirmed"){

confirmOption = `
<div class="px-3 py-1 text-xs text-green-400">
Confirmed
</div>
`

}else{

confirmOption = `
<button onclick="confirmBooking('${q.id}')"
class="block w-full text-left px-3 py-1 text-xs hover:bg-gray-700">
Confirm Booking
</button>
`

}

// ===== CARD HTML =====

card.innerHTML = `

<div class="flex justify-between items-center">

<div>

<h2 class="font-semibold text-sm">
${q.client_name}
</h2>

<p class="text-xs text-gray-400">
${formatDate(q.event_date)}
</p>

</div>

<div class="flex items-center gap-2">

<div class="text-sm font-semibold">
${QUOTATION_INR_SYMBOL}${q.total}
</div>

<button
onclick="toggleMenu(event, '${q.id}')"
data-quotation-menu-toggle="true"
class="text-xl px-2">
${QUOTATION_MENU_ICON}
</button>

</div>

</div>

<div class="mt-3 flex gap-2">

<button onclick="openProposal('${q.id}')"
class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">
View
</button>

<button onclick="deleteQuotation('${q.id}')"
class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">
Delete
</button>

</div>

<div id="menu-${q.id}"
data-quotation-menu="true"
onclick="event.stopPropagation()"
class="hidden absolute right-3 top-12 glass rounded-lg text-xs overflow-hidden">

${confirmOption}

<button onclick="addPayment('${q.id}')"
class="block w-full text-left px-3 py-1 hover:bg-gray-700">
Add Payment
</button>

<button onclick="deleteQuotation('${q.id}')"
class="block w-full text-left px-3 py-1 text-red-400 hover:bg-gray-700">
Delete
</button>

</div>

`

listContainer.appendChild(card)

})

}



// =============================
// TOGGLE MENU
// =============================

function toggleMenu(event,id){

if(event){
event.stopPropagation()
}

const menu =
document.getElementById("menu-" + id)

if(!menu) return

const isHidden = menu.classList.contains("hidden")

closeAllMenus()

if(isHidden){
menu.classList.remove("hidden")
activeQuotationMenuId = id
}else{
menu.classList.add("hidden")
activeQuotationMenuId = null
}

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
// EDIT QUOTATION
// =============================

function editQuotation(id){

window.location.href =
`quotation.html?edit=${id}`

}



// =============================
// APP STYLE CONFIRM MODAL
// =============================

function showQuotationConfirmModal({
title = "Are you sure?",
message = "",
confirmText = "OK",
cancelText = "Cancel",
danger = false
} = {}){

return new Promise((resolve)=>{

const existingModal = document.getElementById("quotationConfirmModal")
if(existingModal){
existingModal.remove()
}

const overlay = document.createElement("div")
overlay.id = "quotationConfirmModal"
overlay.className = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4"

overlay.innerHTML = `
<div class="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-white/10">
<div class="flex items-start gap-3">
<div class="w-10 h-10 rounded-full grid place-items-center ${danger ? "bg-red-500/20 text-red-300" : "bg-indigo-500/20 text-indigo-200"}">
${danger ? "!" : "?"}
</div>
<div class="flex-1">
<h3 class="text-lg font-bold text-white">${title}</h3>
<p class="mt-2 text-sm leading-6 text-gray-300">${message}</p>
</div>
</div>
<div class="mt-5 flex justify-end gap-3">
<button type="button" data-confirm-cancel="true" class="px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/15 text-gray-200">
${cancelText}
</button>
<button type="button" data-confirm-ok="true" class="px-4 py-2 rounded-lg text-sm font-bold ${danger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}">
${confirmText}
</button>
</div>
</div>
`

document.body.appendChild(overlay)

const cleanup = (value)=>{
overlay.remove()
document.removeEventListener("keydown", onKeyDown)
resolve(value)
}

const onKeyDown = (event)=>{
if(event.key === "Escape"){
cleanup(false)
}
}

overlay.querySelector("[data-confirm-cancel='true']").addEventListener("click", ()=>{
cleanup(false)
})

overlay.querySelector("[data-confirm-ok='true']").addEventListener("click", ()=>{
cleanup(true)
})

overlay.addEventListener("click", (event)=>{
if(event.target === overlay){
cleanup(false)
}
})

document.addEventListener("keydown", onKeyDown)

})

}


// =============================
// DELETE QUOTATION
// =============================

async function deleteQuotation(id){

const confirmed = await showQuotationConfirmModal({
title: "Delete quotation?",
message: "This quotation will be permanently deleted. This action cannot be undone.",
confirmText: "Delete",
cancelText: "Cancel",
danger: true
})

if(!confirmed) return

const user = await getCurrentUser()

if(!user) return

const supabase = getSupabase()

const { error } =
await supabase
.from("quotations")
.delete()
.eq("id",id)
.eq("user_id",user.id)

if(error){

console.error("Delete error:",error)
alert("Error deleting quotation")
return

}

loadQuotations()

}



// =============================
// ðŸ”¥ CONFIRM BOOKING (FIXED PROPERLY)
// =============================

async function confirmBooking(id){

if(!confirm("Confirm this booking?")) return

const user = await getCurrentUser()
if(!user) return

const supabase = getSupabase()

// ðŸ”¥ Update status
const { error } =
await supabase
.from("quotations")
.update({ status:"confirmed" })
.eq("id",id)
.eq("user_id",user.id)

if(error){
console.error("Confirm error:",error)
alert("Error confirming booking")
return
}

// ðŸ”¥ GET QUOTATION DATA
const { data: quotation, error: fetchError } =
await supabase
.from("quotations")
.select("*")
.eq("id", id)
.single()

if(fetchError || !quotation){
console.error("Fetch quotation error:", fetchError)
return
}

// ðŸ”¥ CREATE EVENT
const { data: eventData, error: eventError } =
await supabase
.from("events")
.insert([{
user_id: user.id,
client_name: quotation.client_name,
event_name: "Q_" + quotation.id,
event_type: quotation.event_category || "event",
event_date: quotation.event_date,
status: "active"
}])
.select()
.single()

if(eventError){
console.error("EVENT ERROR:", eventError)
return
}

// ðŸ”¥ CREATE TOKEN
const token =
Math.random().toString(36).substring(2,10).toUpperCase()

const { error: tokenError } =
await supabase
.from("event_tokens")
.insert([{
event_id: eventData.id,
token: token,
used: false
}])

if(tokenError){
console.error("TOKEN ERROR:", tokenError)
}

loadQuotations()

}



// =============================
// ADD PAYMENT
// =============================

function addPayment(id){

window.location.href =
`payment.html?quotation=${id}`

}



// =============================
// OPEN PROPOSAL
// =============================

function openProposal(id){

const quotation = loadedQuotationMap.get(String(id))

if(!quotation){
console.error("Quotation not found for proposal view:", id)
return
}

openProposalFromQuotation(quotation)

}



// =============================
// INIT
// =============================

loadQuotations()

