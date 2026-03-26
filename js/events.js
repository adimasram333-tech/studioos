// =============================
// ORIGINAL EVENT LIST (UNCHANGED)
// =============================

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

<div class="glass p-4 rounded-xl">

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

return data

}



// =============================
// 🔥 SMART CALENDAR SYSTEM (NEW)
// =============================

const calendar = document.getElementById("calendar")
const monthLabel = document.getElementById("monthLabel")

let currentDate = new Date()

function getMonthData(year, month){

const firstDay = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()

return { firstDay, daysInMonth }

}


// LOAD CALENDAR

async function loadCalendar(){

if(!calendar) return

const { data:{ user } } =
await supabase.auth.getUser()

if(!user) return

// FETCH EVENTS
const { data } =
await supabase
.from("quotations")
.select("*")
.eq("user_id",user.id)
.eq("status","confirmed")

// MAP EVENTS
const eventDates = {}

data.forEach(e=>{
eventDates[e.event_date] = true
})

// LOAD NOTES
const notes = JSON.parse(localStorage.getItem("calendar_notes") || "{}")

const year = currentDate.getFullYear()
const month = currentDate.getMonth()

const { firstDay, daysInMonth } = getMonthData(year, month)

calendar.innerHTML = ""

monthLabel.innerText =
currentDate.toLocaleString("default",{month:"long",year:"numeric"})

// EMPTY CELLS
for(let i=0;i<firstDay;i++){
calendar.innerHTML += `<div></div>`
}

// DAYS
for(let d=1; d<=daysInMonth; d++){

const fullDate =
`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

let color = "bg-slate-800"

// 🔴 EVENT
if(eventDates[fullDate]){
color = "bg-red-600"
}

// 🔵 NOTE
if(notes[fullDate]){
color = "bg-blue-600"
}

calendar.innerHTML += `
<div 
class="${color} p-2 rounded cursor-pointer"
onclick="openModal('${fullDate}')"
>
${d}
</div>
`

}

}


// =============================
// 📝 NOTES SYSTEM
// =============================

const modal = document.getElementById("modal")
const noteInput = document.getElementById("noteInput")
const selectedDate = document.getElementById("selectedDate")

let activeDate = null

function openModal(date){

activeDate = date

selectedDate.innerText = date

const notes = JSON.parse(localStorage.getItem("calendar_notes") || "{}")

noteInput.value = notes[date] || ""

modal.classList.remove("hidden")

}

function closeModal(){
modal.classList.add("hidden")
}

document.getElementById("saveNote").addEventListener("click",function(){

const notes = JSON.parse(localStorage.getItem("calendar_notes") || "{}")

notes[activeDate] = noteInput.value

localStorage.setItem("calendar_notes",JSON.stringify(notes))

closeModal()

loadCalendar()

})


// =============================
// 📅 MONTH NAVIGATION
// =============================

document.getElementById("prevMonth").onclick = function(){
currentDate.setMonth(currentDate.getMonth() - 1)
loadCalendar()
}

document.getElementById("nextMonth").onclick = function(){
currentDate.setMonth(currentDate.getMonth() + 1)
loadCalendar()
}


// =============================
// INIT
// =============================

loadEvents()
loadCalendar()