// =============================
// GET CURRENT USER
// =============================

async function getCurrentUser(){

const { data:{ user } } =
await supabase.auth.getUser()

return user

}


// =============================
// FETCH QUOTATIONS
// =============================

async function getAllQuotations(){

const user = await getCurrentUser()

if(!user) return []

const { data, error } =
await supabase
.from("quotations")
.select("*")
.eq("user_id",user.id)
.order("created_at",{ascending:false})

if(error){

console.error("Fetch error:",error)
return []

}

return data

}



// =============================
// LOAD QUOTATIONS
// =============================

async function loadQuotations(){

const listContainer =
document.getElementById("quotationList")

if(!listContainer) return


listContainer.innerHTML =
"<p class='text-gray-400 text-sm'>Loading quotations...</p>"


const quotations = await getAllQuotations()


if(!quotations || quotations.length === 0){

listContainer.innerHTML =
"<p class='text-gray-400'>No quotations found.</p>"

return

}


listContainer.innerHTML = ""


quotations.forEach((q)=>{


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

card.className = "glass p-4 rounded-xl"


card.innerHTML = `

<div>

<h2 class="text-lg font-semibold">
${q.client_name}
</h2>

<p class="text-sm text-gray-400">
Event: ${formatDate(q.event_date)}
</p>

<p class="text-xs text-gray-500">
Created: ${formatDate(q.created_at)}
</p>

<p class="text-sm mt-1">
Total: ₹${q.total}
</p>

</div>


<div class="mt-3 flex gap-2">

<button onclick="openProposal('${proposalLink}')"
class="bg-blue-600 px-3 py-1 rounded-lg text-sm">
View
</button>

<button onclick="editQuotation('${q.id}')"
class="bg-indigo-600 px-3 py-1 rounded-lg text-sm">
Edit
</button>

<button onclick="deleteQuotation('${q.id}')"
class="bg-red-600 px-3 py-1 rounded-lg text-sm">
Delete
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
month:"short",
year:"numeric"
})

}



// =============================
// EDIT QUOTATION
// =============================

function editQuotation(id){

window.location.href =
`quotation.html?edit=${id}`

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