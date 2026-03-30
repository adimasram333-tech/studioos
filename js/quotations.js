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


listContainer.innerHTML =
"<p class='text-gray-400 text-sm'>Loading quotations...</p>"


const quotations = await getAllQuotations()


if(!quotations || quotations.length === 0){

listContainer.innerHTML =
"<p class='text-gray-400 text-sm'>No quotations found.</p>"

return

}


listContainer.innerHTML = ""


quotations.forEach((q)=>{


// ===== BUILD SEO LINK =====

const slug =
(q.client_name || "client")
.toLowerCase()
.replace(/\s+/g,"-")

const shortId =
q.short_id || q.id.substring(0,8)

const proposalLink =
"p/" + slug + "-" + shortId



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
₹${q.total}
</div>

<button onclick="toggleMenu('${q.id}')"
class="text-xl px-2">
⋮
</button>

</div>

</div>


<div class="mt-3 flex gap-2">

<button onclick="openProposal('${proposalLink}')"
class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">
View
</button>

<button onclick="editQuotation('${q.id}')"
class="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">
Edit
</button>

</div>


<div id="menu-${q.id}"
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

function toggleMenu(id){

const menu =
document.getElementById("menu-" + id)

menu.classList.toggle("hidden")

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
// CONFIRM BOOKING (FIXED)
// =============================

async function confirmBooking(id){

if(!confirm("Confirm this booking?")) return

const user = await getCurrentUser()
if(!user) return

const supabase = getSupabase()

// 🔥 Update status
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

// =============================
// 🔥 FETCH QUOTATION + CREATE EVENT & TOKEN
// =============================

const { data: quotation, error: fetchError } =
await supabase
.from("quotations")
.select("*")
.eq("id", id)
.single()

if(fetchError){
console.error("Fetch quotation error:", fetchError)
}

// 🔥 call existing logic (NO DUPLICATE CODE)
if(window.createEventIfConfirmed){
await window.createEventIfConfirmed(quotation)
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

function openProposal(link){

window.location.href = link

}



// =============================
// INIT
// =============================

loadQuotations()