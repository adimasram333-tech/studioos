const eventList = document.getElementById("eventList")

async function loadEvents(){

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

eventList.innerHTML =
"<p>Error loading events</p>"

return

}


if(!data || data.length === 0){

eventList.innerHTML =
"<p>No upcoming events</p>"

return

}


eventList.innerHTML = ""


data.forEach(e=>{

eventList.innerHTML += `

<div class="bg-slate-800 p-4 rounded-xl">

<p class="text-lg font-semibold">
${e.client_name}
</p>

<p class="text-gray-400">
${new Date(e.event_date).toLocaleDateString()}
</p>

<p class="mt-2 text-sm">
Total ₹${e.total}
</p>

</div>

`

})

}

loadEvents()