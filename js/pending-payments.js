const list = document.getElementById("pendingList")

async function loadPending(){

const { data:{ user } } =
await supabase.auth.getUser()

if(!user) return

const { data: quotations } =
await supabase
.from("quotations")
.select("*")
.eq("user_id", user.id)
.eq("status","confirmed")

list.innerHTML = ""

if(!quotations || quotations.length === 0){

list.innerHTML =
"<p class='text-gray-400'>No pending payments</p>"

return

}

for(const q of quotations){

const { data: payments } =
await supabase
.from("payments")
.select("amount")
.eq("quotation_id", q.id)

let paid = 0

payments?.forEach(p=>{
paid += Number(p.amount || 0)
})

const pending = q.total - paid

if(pending <= 0) continue

const date =
new Date(q.event_date)
.toLocaleDateString("en-IN")

const card = document.createElement("div")

card.className =
"glass rounded-xl p-4 cursor-pointer"

card.onclick =
() => location.href = "client.html?id="+q.id

card.innerHTML = `

<div class="flex justify-between">

<div>

<p class="font-semibold">
${q.client_name}
</p>

<p class="text-xs text-gray-400">
${q.total} • ${date}
</p>

</div>

<p class="text-red-400 font-semibold">
Pending ₹${pending}
</p>

</div>

`

list.appendChild(card)

}

if(list.innerHTML === ""){
list.innerHTML =
"<p class='text-gray-400'>No pending payments</p>"
}

}

loadPending()