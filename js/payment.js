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

return params.get("quotation")

}


// =============================
// LOAD PAYMENT SUMMARY
// =============================

async function loadSummary(){

const supabase = await window.getSupabase()

const quotationId = getQuotationId()

if(!quotationId) return

// GET QUOTATION TOTAL

const { data: quotation } =
await supabase
.from("quotations")
.select("total")
.eq("id", quotationId)
.single()

let total = Number(quotation?.total || 0)


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

const supabase = await window.getSupabase()

const quotationId = getQuotationId()

if(!quotationId) return

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

container.innerHTML =
"<p class='text-red-400'>Error loading payments</p>"

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

let savingPayment = false

async function savePayment(){

if(savingPayment) return

const supabase = await window.getSupabase()

const user = await getCurrentUser()

if(!user) return


const quotationId = getQuotationId()

if(!quotationId){
alert("Invalid quotation")
return
}

const amountEl =
document.getElementById("paymentAmount")

const dateEl =
document.getElementById("paymentDate")

const methodEl =
document.getElementById("paymentMethod")

const typeEl =
document.getElementById("paymentType")

const amount =
amountEl?.value

const date =
dateEl?.value

const method =
methodEl?.value

const type =
typeEl?.value


if(!amount || !date || !method || !type){

alert("Please fill all fields")
return

}

savingPayment = true


// INSERT PAYMENT

const { error } =
await supabase
.from("payments")
.insert([{

user_id: user.id,
quotation_id: quotationId,
amount: Number(amount),
payment_date: date,
payment_type: type,
method: method

}])


savingPayment = false


if(error){

console.error(error)
alert("Error saving payment")
return

}


alert("Payment saved successfully")

// reload history
loadPayments()

// clear form

if(amountEl) amountEl.value = ""
if(dateEl) dateEl.value = ""
if(methodEl) methodEl.value = ""
if(typeEl) typeEl.value = ""

}


// =============================
// INIT
// =============================

const saveBtn =
document.getElementById("savePaymentBtn")

if(saveBtn){
saveBtn.addEventListener("click", savePayment)
}


// SAFE INIT
const quotationId = getQuotationId()

if(quotationId){
loadPayments()
}