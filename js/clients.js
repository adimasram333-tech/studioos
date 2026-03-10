// =============================
// GET CURRENT USER
// =============================

async function getCurrentUser(){

const { data:{ user } } =
await supabase.auth.getUser()

return user

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
// LOAD CLIENTS
// =============================

async function loadClients(){

const user = await getCurrentUser()

if(!user) return


const container =
document.getElementById("clientsList")

if(!container) return


container.innerHTML =
"<p class='text-gray-400 text-sm'>Loading clients...</p>"


// GET CONFIRMED BOOKINGS

const { data: clients, error } =
await supabase
.from("quotations")
.select("*")
.eq("user_id",user.id)
.eq("status","confirmed")
.order("event_date",{ascending:true})


if(error){

console.error("Clients load error:",error)

container.innerHTML =
"<p class='text-gray-400'>Error loading clients</p>"

return

}


if(!clients || clients.length === 0){

container.innerHTML =
"<p class='text-gray-400'>No clients yet</p>"

return

}


container.innerHTML = ""


for(const c of clients){

// GET PAYMENTS

const { data: payments } =
await supabase
.from("payments")
.select("amount")
.eq("quotation_id",c.id)


let paid = 0

payments?.forEach(p=>{
paid += Number(p.amount || 0)
})


const total =
Number(c.total || 0)

const pending =
total - paid


const card =
document.createElement("div")

card.className =
"glass p-4 rounded-xl cursor-pointer"


card.innerHTML = `

<div class="flex justify-between items-center">

<div>

<h2 class="font-semibold text-sm">
${c.client_name}
</h2>

<p class="text-xs text-gray-400">
${c.package || "Event"} • ${formatDate(c.event_date)}
</p>

</div>

<div class="text-xs text-right">

<div class="text-gray-400">
Pending
</div>

<div class="font-semibold">
₹${pending}
</div>

</div>

</div>

`


// CLIENT PROFILE LINK

card.addEventListener("click",()=>{

window.location.href =
"client.html?quotation=" + c.id

})


container.appendChild(card)

}

}



// =============================
// INIT
// =============================

loadClients()