const eventList = document.getElementById("eventList")

async function loadEvents(){

if(!eventList) return

const { data:{ user } } =
await supabase.auth.getUser()

if(!user) return


// FETCH CONFIRMED EVENTS
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


// GROUP EVENTS BY DATE
const grouped = {}

data.forEach(e=>{

const date = e.event_date

if(!grouped[date]){
grouped[date] = []
}

grouped[date].push(e)

})

eventList.innerHTML = ""


// SORT DATES
const sortedDates =
Object.keys(grouped).sort(
(a,b)=> new Date(a) - new Date(b)
)


// RENDER GROUPED EVENTS
sortedDates.forEach(date=>{

const events = grouped[date]

const eventDate =
new Date(date).toLocaleDateString("en-IN",{
day:"numeric",
month:"long",
year:"numeric"
})

let busyLabel = ""

if(events.length >= 8){

busyLabel =
"<span class='text-red-400 text-xs ml-2'>🔥 Very Busy Day</span>"

}
else if(events.length >= 5){

busyLabel =
"<span class='text-yellow-400 text-xs ml-2'>⚡ Busy Day</span>"

}


eventList.innerHTML += `

<div class="bg-slate-800 p-4 rounded-xl">

<p class="text-lg font-semibold mb-2">
${eventDate}
<span class="text-gray-400 text-sm">
(${events.length} events)
</span>
${busyLabel}
</p>

<div class="space-y-1">

${events.map(e=>`
<div 
class="text-sm text-gray-300 cursor-pointer hover:text-white transition"
onclick="location.href='client.html?id=${e.id}'"
>
• ${e.client_name} — ₹${e.total}
</div>
`).join("")}

</div>

</div>

`

})

}

loadEvents()