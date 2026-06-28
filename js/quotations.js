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
â‚¹${q.total}
</div>

<button
onclick="toggleMenu(event, '${q.id}')"
data-quotation-menu-toggle="true"
class="text-xl px-2">
â‹®
</button>

</div>

</div>

<div class="mt-3 flex gap-2">

<button onclick="openProposal('${q.id}')"
class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">
View
</button>

<button onclick="editQuotation('${q.id}')"
class="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">
Edit
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
// DELETE QUOTATION
// =============================

async function deleteQuotation(id){

if(!confirm("Delete this quotation?")) return

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

