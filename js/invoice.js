// =============================
// GET CURRENT USER
// =============================

async function getCurrentUser(){

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
// LOAD STUDIO INFO
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

document.getElementById("studioFooter").innerText =
data.studio_name || "Studio"

document.getElementById("studioPhone").innerText =
data.phone || "-"

document.getElementById("studioEmail").innerText =
data.email || "-"

}



// =============================
// LOAD INVOICE DATA
// =============================

async function loadInvoice(){

const quotationId = getQuotationId()

if(!quotationId) return


// GET QUOTATION

const { data: quote } =
await supabase
.from("quotations")
.select("*")
.eq("id",quotationId)
.single()

if(!quote) return


// CLIENT DETAILS

document.getElementById("clientName").innerText =
quote.client_name || "-"

document.getElementById("clientPhone").innerText =
quote.phone || "-"


// EVENT DETAILS

document.getElementById("eventType").innerText =
quote.package || "-"

document.getElementById("eventDate").innerText =
formatDate(quote.event_date)

document.getElementById("eventVenue").innerText =
quote.venue || "-"



// TOTAL

const total =
Number(quote.total || 0)

document.getElementById("invoiceTotal").innerText =
"₹" + total



// GET PAYMENTS

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



// PAID

document.getElementById("invoicePaid").innerText =
"₹" + paid


// BALANCE

const balance =
total - paid

document.getElementById("invoiceBalance").innerText =
"₹" + balance


// INVOICE NUMBER

document.getElementById("invoiceNumber").innerText =
"INV-" + quotationId.substring(0,6).toUpperCase()

}



// =============================
// DOWNLOAD INVOICE (COMING)
// =============================

function downloadInvoice(){

alert("PDF download coming soon")

}



// =============================
// INIT
// =============================

document
.getElementById("downloadInvoice")
.addEventListener("click",downloadInvoice)


loadStudio()

loadInvoice()