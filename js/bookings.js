const bookingList = document.getElementById("bookingList")

async function loadBookings(){

const { data:{ user } } =
await supabase.auth.getUser()

if(!user) return


const { data , error } =
await supabase
.from("quotations")
.select("*")
.eq("user_id",user.id)
.eq("status","confirmed")
.order("event_date",{ascending:true})


if(error){

console.error(error)
bookingList.innerHTML =
"<p>Error loading bookings</p>"
return

}


if(!data || data.length === 0){

bookingList.innerHTML =
"<p>No confirmed bookings yet.</p>"

return

}


bookingList.innerHTML = ""


data.forEach(b=>{

const slug =
(b.client_name || "client")
.toLowerCase()
.replace(/\s+/g,"-")

const shortId =
b.short_id || b.id.substring(0,8)

const proposalLink =
"p/" + slug + "-" + shortId


bookingList.innerHTML += `

<div class="bg-slate-800 p-4 rounded-xl">

<p class="font-semibold text-lg">
${b.client_name}
</p>

<p class="text-gray-400">
${new Date(b.event_date).toLocaleDateString()}
</p>

<div class="mt-2 text-sm">

<p>Total: ₹${b.total}</p>
<p>Advance: ₹${b.advance}</p>
<p>Balance: ₹${b.balance}</p>

</div>

<div class="mt-3 flex gap-2 flex-wrap">

<button
onclick="openProposal('${proposalLink}')"
class="bg-blue-600 px-3 py-1 rounded-lg text-sm">
Open Proposal
</button>

<button
onclick="updatePayment('${b.id}',${b.advance},${b.balance})"
class="bg-yellow-600 px-3 py-1 rounded-lg text-sm">
Update Payment
</button>

<button
onclick="deleteBooking('${b.id}')"
class="bg-red-600 px-3 py-1 rounded-lg text-sm">
Delete
</button>

</div>

</div>

`

})

}


// ===========================
// UPDATE PAYMENT
// ===========================

async function updatePayment(id,currentAdvance,currentBalance){

const amount =
prompt("Enter received amount:")

if(!amount) return

const received = Number(amount)

if(received <= 0){
alert("Invalid amount")
return
}

const newAdvance =
Number(currentAdvance) + received

const newBalance =
Number(currentBalance) - received

let newStatus = "confirmed"

if(newBalance <= 0){
newStatus = "completed"
}


const { error } =
await supabase
.from("quotations")
.update({
advance:newAdvance,
balance:newBalance < 0 ? 0 : newBalance,
status:newStatus
})
.eq("id",id)


if(error){

alert("Error updating payment")
return

}

loadBookings()

}


// ===========================
// OPEN PROPOSAL
// ===========================

function openProposal(link){

window.location.href = link

}


// ===========================
// DELETE BOOKING
// ===========================

async function deleteBooking(id){

if(!confirm("Delete this booking?")) return

const { error } =
await supabase
.from("quotations")
.delete()
.eq("id",id)

if(error){

alert("Error deleting booking")
return

}

loadBookings()

}


// ===========================
// INIT
// ===========================

loadBookings()