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
// MENU LOGIC (FIXED)
// =============================

const menuBtn = document.getElementById("menuBtn")
const menuDropdown = document.getElementById("menuDropdown")

if(menuBtn && menuDropdown){

menuBtn.addEventListener("click",(e)=>{
e.stopPropagation()
menuDropdown.classList.toggle("hidden")
})

document.addEventListener("click",()=>{
menuDropdown.classList.add("hidden")
})

}



// =============================
// MENU ACTIONS (NEW)
// =============================

const openTeamBtn = document.getElementById("openTeamBtn")
const viewTeamSheetBtn = document.getElementById("viewTeamSheetBtn")
const shareTeamBtn = document.getElementById("shareTeamBtn")

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
const url =
window.location.origin +
"/team-sheet.html?quotation=" +
quotationId

await navigator.clipboard.writeText(url)
alert("Team sheet link copied")
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