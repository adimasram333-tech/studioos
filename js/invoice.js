// =============================
// GET CURRENT USER
// =============================

async function getCurrentUser(){

const { data:{ user } } =
await supabase.auth.getUser()

return user

}


// =============================
// GET QUOTATION ID
// =============================

function getQuotationId(){

const params =
new URLSearchParams(window.location.search)

return params.get("quotation")

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
// FORMAT CURRENCY
// =============================

function formatCurrency(amount){

return new Intl.NumberFormat("en-IN",{
style:"currency",
currency:"INR",
maximumFractionDigits:0
}).format(amount)

}


// =============================
// LOAD STUDIO
// =============================

async function loadStudio(){

const user = await getCurrentUser()

if(!user) return

const { data } =
await supabase
.from("photographer_settings")
.select("*")
.eq("user_id",user.id)
.single()

if(!data) return

document.getElementById("studioName").innerText =
data.studio_name || "Studio"

document.getElementById("studioPhone").innerText =
data.phone || "-"

document.getElementById("studioEmail").innerText =
data.email || "-"

document.getElementById("photographerName").innerText =
data.studio_name || "Photographer"

}


// =============================
// LOAD INVOICE
// =============================

async function loadInvoice(){

const quotationId = getQuotationId()

if(!quotationId) return


// =============================
// GET QUOTATION
// =============================

const { data: quote } =
await supabase
.from("quotations")
.select("*")
.eq("id",quotationId)
.single()

if(!quote) return


// =============================
// CLIENT
// =============================

document.getElementById("clientName").innerText =
quote.client_name || "-"

document.getElementById("clientPhone").innerText =
quote.phone || "-"


// =============================
// INVOICE DATE
// =============================

document.getElementById("invoiceDate").innerText =
formatDate(quote.created_at)


// =============================
// EVENT DETAILS
// =============================

const eventType =
quote.event_category ||
quote.event_type ||
quote.event_name ||
"-"

document.getElementById("eventType").innerText =
eventType

document.getElementById("eventVenue").innerText =
quote.venue || "-"


// =============================
// EVENT DATE FIX
// =============================

const startDate =
quote.event_start_date ||
quote.event_date

const endDate =
quote.event_end_date ||
quote.event_date

let eventDateText = formatDate(startDate)

if(endDate && startDate !== endDate){
eventDateText =
formatDate(startDate) + " → " + formatDate(endDate)
}

document.getElementById("eventStart").innerText =
eventDateText

document.getElementById("eventEnd").innerText = ""


// =============================
// TOTAL PACKAGE
// =============================

const total = Number(quote.total || 0)

document.getElementById("invoiceTotal").innerText =
formatCurrency(total)

document.getElementById("invoiceTotalFooter").innerText =
formatCurrency(total)


// =============================
// LOAD PAYMENTS
// =============================

const { data: payments } =
await supabase
.from("payments")
.select("*")
.eq("quotation_id", quotationId)
.order("payment_date",{ascending:true})


const container =
document.getElementById("invoicePayments")

let paid = 0


if(!payments || payments.length === 0){

container.innerHTML =
"<p class='text-gray-500 text-sm'>No payments yet</p>"

}else{

container.innerHTML = ""

payments.forEach(p=>{

paid += Number(p.amount || 0)

const row =
document.createElement("div")

row.className =
"flex justify-between border-b py-2 text-sm"

row.innerHTML = `

<div>
<strong>${formatCurrency(p.amount)}</strong>
<span class="text-gray-500 ml-2">
${p.payment_type || ""} • ${p.method || ""}
</span>
</div>

<div class="text-gray-500">
${formatDate(p.payment_date)}
</div>

`

container.appendChild(row)

})

}


// =============================
// CALCULATIONS
// =============================

document.getElementById("invoicePaid").innerText =
formatCurrency(paid)

document.getElementById("invoicePaidFooter").innerText =
formatCurrency(paid)

const balance =
total - paid

document.getElementById("invoiceBalance").innerText =
formatCurrency(balance)

document.getElementById("invoiceBalanceFooter").innerText =
formatCurrency(balance)


// =============================
// INVOICE NUMBER
// =============================

const year = new Date().getFullYear()

document.getElementById("invoiceNumber").innerText =
`INV-${year}-${quotationId.substring(0,3).toUpperCase()}`

}


// =============================
// DOWNLOAD PDF
// =============================

function downloadInvoice(){

const element =
document.getElementById("invoiceContainer")

const quotationId = getQuotationId()

const opt = {

margin:[0.25,0.25,0.25,0.25],

filename:`invoice-${quotationId}.pdf`,

image:{
type:"jpeg",
quality:1
},

html2canvas:{
scale:3,
useCORS:true,
scrollY:0,
windowWidth:794
},

pagebreak:{
mode:['avoid-all','css','legacy']
},

jsPDF:{
unit:"in",
format:"a4",
orientation:"portrait"
}

}

html2pdf().set(opt).from(element).save()

}


// =============================
// INIT
// =============================

document
.getElementById("downloadInvoice")
.addEventListener("click",downloadInvoice)

loadStudio()
loadInvoice()