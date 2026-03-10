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


if(!amount || !date || !method){

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
method: method

}])


if(error){

console.error(error)
alert("Error saving payment")
return

}


alert("Payment saved successfully")

window.location.href = "quotations.html"

}


// =============================
// INIT
// =============================

document
.getElementById("savePaymentBtn")
.addEventListener("click", savePayment)