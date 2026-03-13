const list = document.getElementById("revenueList")

async function loadRevenue(){

const { data:{ user } } =
await supabase.auth.getUser()

if(!user) return



const now = new Date()
const month = now.getMonth()
const year = now.getFullYear()



// =============================
// GET PAYMENTS
// =============================

const { data: payments } =
await supabase
.from("payments")
.select("*")
.eq("user_id", user.id)
.order("payment_date",{ascending:false})



list.innerHTML = ""

if(!payments || payments.length === 0){

list.innerHTML =
"<p class='text-gray-400'>No payments this month</p>"

return

}



// =============================
// LOOP PAYMENTS
// =============================

for(const p of payments){

const date = new Date(p.payment_date)

if(
date.getMonth() !== month ||
date.getFullYear() !== year
) continue



// =============================
// GET CLIENT NAME
// =============================

const { data: quotation } =
await supabase
.from("quotations")
.select("client_name")
.eq("id", p.quotation_id)
.single()



const clientName =
quotation?.client_name || "Client"



const card = document.createElement("div")

card.className =
"glass rounded-xl p-4"



card.innerHTML = `

<div class="flex justify-between">

<div>

<p class="font-semibold">
${clientName}
</p>

<p class="text-xs text-gray-400">
${date.toLocaleDateString("en-IN")}
</p>

</div>

<div class="text-right">

<p class="font-semibold">
₹${p.amount}
</p>

<p class="text-xs text-gray-400">
${p.method || ""}
</p>

</div>

</div>

`

list.appendChild(card)

}



// =============================
// EMPTY STATE CHECK
// =============================

if(list.innerHTML === ""){
list.innerHTML =
"<p class='text-gray-400'>No payments this month</p>"
}

}

loadRevenue()