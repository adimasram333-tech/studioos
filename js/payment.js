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
// LOAD PAYMENT SUMMARY
// =============================

async function loadSummary(){

const quotationId = getQuotationId()

// GET QUOTATION TOTAL

const { data: quotation } =
await supabase
.from("quotations")
.select("total")
.eq("id", quotationId)
.single()

let total = quotation?.total || 0


// GET PAYMENTS

const { data: payments } =
await supabase
.from("payments")
.select("amount")
.eq("quotation_id", quotationId)

let paid = 0

payments?.forEach(p=>{
paid += Number(p.amount || 0)
})

const remaining = total - paid


// UPDATE UI

const totalEl =
document.getElementById("totalPackage")

const paidEl =
document.getElementById("paidAmount")

const remainingEl =
document.getElementById("remainingAmount")

if(totalEl) totalEl.innerText = "₹" + total
if(paidEl) paidEl.innerText = "₹" + paid
if(remainingEl) remainingEl.innerText = "₹" + remaining

}


// =============================
// LOAD PAYMENT HISTORY
// =============================

async function loadPayments(){

const quotationId = getQuotationId()

const container =
document.getElementById("paymentHistory")

if(!container) return


const { data, error } =
await supabase
.from("payments")
.select("*")
.eq("quotation_id", quotationId)
.order("payment_date",{ascending:false})


if(error){

console.error("Payment load error:",error)
return

}


if(!data || data.length === 0){

container.innerHTML =
"<p class='text-gray-400'>No payments yet</p>"

loadSummary()
return

}


container.innerHTML = ""


data.forEach(p=>{

const date =
new Date(p.payment_date)
.toLocaleDateString("en-IN")

const row =
document.createElement("div")

row.className =
"flex justify-between glass p-2 rounded"

row.innerHTML = `

<div>

<div>₹${p.amount}</div>

<div class="text-xs text-gray-400">
${p.payment_type} • ${p.method}
</div>

</div>

<div class="text-xs text-gray-400">
${date}
</div>

`

container.appendChild(row)

})

loadSummary()

}


// =============================
// SAVE PAYMENT
// =============================

async function savePayment(){

const user = await getCurrentUser()

if(!user) return


const quotationId = getQuotationId()

const amount =
document.getElementById("paymentAmount").value

const date =
document.getElementById("paymentDate").value

const method =
document.getElementById("paymentMethod").value

const type =
document.getElementById("paymentType").value


if(!amount || !date || !method || !type){

alert("Please fill all fields")
return

}


// INSERT PAYMENT

const { error } =
await supabase
.from("payments")
.insert([{

user_id: user.id,
quotation_id: quotationId,
amount: amount,
payment_date: date,
payment_type: type,
method: method

}])


if(error){

console.error(error)
alert("Error saving payment")
return

}


alert("Payment saved successfully")

// reload history
loadPayments()

// clear form

document.getElementById("paymentAmount").value = ""
document.getElementById("paymentDate").value = ""
document.getElementById("paymentMethod").value = ""
document.getElementById("paymentType").value = ""

}


// =============================
// INIT
// =============================

document
.getElementById("savePaymentBtn")
.addEventListener("click", savePayment)

loadPayments()