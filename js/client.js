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
// LOAD CLIENT PROFILE
// =============================

async function loadClient(){

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
// CLIENT DETAILS
// =============================

document.getElementById("clientName").innerText =
quote.client_name || "-"

document.getElementById("clientPhone").innerText =
quote.phone || "-"



// =============================
// EVENT DETAILS (FIXED)
// =============================

const eventType =
quote.event_category ||
quote.event_type ||
quote.package ||
"-"

document.getElementById("eventType").innerText =
eventType

document.getElementById("eventDate").innerText =
formatDate(quote.event_date)

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
// PAID AMOUNT
// =============================

document.getElementById("paidAmount").innerText =
"₹" + paid



// =============================
// BALANCE (UPDATED)
// =============================

const balance =
total - paid

document.getElementById("balanceAmount").innerText =
"₹" + balance



// =============================
// ADD PAYMENT BUTTON
// =============================

document.getElementById("addPaymentBtn").href =
"payment.html?quotation=" + quotationId



// =============================
// VIEW INVOICE BUTTON
// =============================

document.getElementById("viewInvoiceBtn").href =
"invoice.html?quotation=" + quotationId


}



// =============================
// INIT
// =============================

loadClient()