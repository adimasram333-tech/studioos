// =============================
// STUDIOOS APP MESSAGE HELPERS
// =============================

function showStudioOSToast(message, type = "success"){

const existingToast = document.getElementById("studioosPaymentToast")
if(existingToast){
existingToast.remove()
}

const toast = document.createElement("div")
toast.id = "studioosPaymentToast"
toast.style.position = "fixed"
toast.style.left = "50%"
toast.style.bottom = "calc(84px + env(safe-area-inset-bottom, 0px))"
toast.style.transform = "translateX(-50%)"
toast.style.width = "min(calc(100% - 32px), 340px)"
toast.style.zIndex = "2147482600"
toast.style.padding = "0.82rem 1rem"
toast.style.borderRadius = "1rem"
toast.style.background = type === "error" ? "rgba(127,29,29,0.96)" : "rgba(15,23,42,0.96)"
toast.style.border = type === "error" ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(255,255,255,0.12)"
toast.style.boxShadow = "0 18px 55px rgba(0,0,0,0.38)"
toast.style.backdropFilter = "blur(16px)"
toast.style.webkitBackdropFilter = "blur(16px)"
toast.style.color = "#ffffff"
toast.style.fontSize = "0.88rem"
toast.style.fontWeight = "800"
toast.style.textAlign = "center"
toast.style.pointerEvents = "none"
toast.textContent = message

document.body.appendChild(toast)

setTimeout(()=>{
toast.style.transition = "opacity 180ms ease, transform 180ms ease"
toast.style.opacity = "0"
toast.style.transform = "translateX(-50%) translateY(8px)"
setTimeout(()=>{
toast.remove()
}, 220)
}, 1800)

}

function syncPaymentCustomSelects(){

try{
if(window.StudioOSPaymentSelect && typeof window.StudioOSPaymentSelect.syncAll === "function"){
window.StudioOSPaymentSelect.syncAll()
}
}catch(e){
console.warn("Payment select sync skipped:", e)
}

}


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
showStudioOSToast("Invalid quotation", "error")
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

showStudioOSToast("Please fill all fields", "error")
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
showStudioOSToast("Error saving payment", "error")
return

}


showStudioOSToast("Payment saved successfully")

// reload history
loadPayments()

// clear form

if(amountEl) amountEl.value = ""
if(dateEl) dateEl.value = ""
if(methodEl){
methodEl.value = ""
methodEl.dispatchEvent(new Event("change", { bubbles:true }))
}

if(typeEl){
typeEl.value = ""
typeEl.dispatchEvent(new Event("change", { bubbles:true }))
}

syncPaymentCustomSelects()

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