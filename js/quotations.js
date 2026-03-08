// =============================
// LOAD QUOTATIONS FROM SUPABASE
// =============================

async function loadQuotations(){

const listContainer =
document.getElementById("quotationList")

if(!listContainer) return


const quotations = await getAllQuotations()


if(!quotations || quotations.length === 0){

listContainer.innerHTML =
"<p class='text-gray-400'>No quotations found.</p>"

return

}


listContainer.innerHTML = ""


quotations.forEach((q)=>{


const statusColor =
q.status === "proposal"
? "bg-gray-500"
: q.status === "sent"
? "bg-yellow-500"
: q.status === "confirmed"
? "bg-green-600"
: "bg-red-500"


// ===== BUILD SEO LINK =====

const slug =
(q.client_name || "client")
.toLowerCase()
.replace(/\s+/g,"-")

const shortId =
q.short_id || q.id.substring(0,8)

const proposalLink =
"p/" + slug + "-" + shortId



const card = document.createElement("div")

card.className = "glass p-5 rounded-2xl"


card.innerHTML = `
<div class="flex justify-between items-center">

<div>
<h2 class="text-lg font-semibold">${q.client_name}</h2>
<p class="text-sm text-gray-400">
${formatDate(q.event_date)}
</p>
</div>

<span class="px-3 py-1 text-sm rounded-full ${statusColor}">
${q.status}
</span>

</div>

<div class="mt-3 text-sm">

<p>Total: ₹${q.total}</p>
<p>Advance: ₹${q.advance}</p>
<p>Balance: ₹${q.balance}</p>

</div>

<div class="mt-4 flex gap-2 flex-wrap">

<button onclick="markSent('${q.id}')"
class="bg-yellow-600 px-3 py-1 rounded-lg text-sm">
Mark Sent
</button>

<button onclick="markConfirmed('${q.id}')"
class="bg-green-600 px-3 py-1 rounded-lg text-sm">
Confirm
</button>

<button onclick="deleteQuotation('${q.id}')"
class="bg-red-600 px-3 py-1 rounded-lg text-sm">
Delete
</button>

<button onclick="openProposal('${proposalLink}')"
class="bg-blue-600 px-3 py-1 rounded-lg text-sm">
Open Proposal
</button>

</div>
`

listContainer.appendChild(card)

})

}



// =============================
// FORMAT DATE
// =============================

function formatDate(dateString){

if(!dateString) return "-"

const date = new Date(dateString)

return date.toLocaleDateString("en-IN",{
day:"numeric",
month:"long",
year:"numeric"
})

}



// =============================
// UPDATE STATUS
// =============================

async function updateStatus(id,newStatus){

const { error } =
await supabase
.from("quotations")
.update({status:newStatus})
.eq("id",id)

if(error){

console.error("Status update error:",error)
alert("Error updating status")
return

}

loadQuotations()

}



// =============================
// MARK SENT
// =============================

function markSent(id){
updateStatus(id,"sent")
}



// =============================
// MARK CONFIRMED
// =============================

function markConfirmed(id){
updateStatus(id,"confirmed")
}



// =============================
// DELETE QUOTATION
// =============================

async function deleteQuotation(id){

if(!confirm("Delete this quotation?")) return

const { error } =
await supabase
.from("quotations")
.delete()
.eq("id",id)

if(error){

console.error("Delete error:",error)
alert("Error deleting quotation")
return

}

loadQuotations()

}



// =============================
// OPEN PROPOSAL
// =============================

function openProposal(link){

window.location.href = link

}



// =============================
// INIT
// =============================

loadQuotations()