// =============================
// SAFE WAIT FOR SUPABASE
// =============================

async function waitForSupabase(){
return new Promise(resolve=>{
const check = ()=>{
if(typeof window.getSupabase === "function"){
resolve()
}else{
setTimeout(check,100)
}
}
check()
})
}


// =============================
// GET CURRENT USER
// =============================

async function getCurrentUser(){
const supabase = await window.getSupabase()
const { data:{ user } } = await supabase.auth.getUser()
return user
}


// =============================
// GLOBAL ELEMENTS
// =============================

let eventList = null
let calendar = null
let monthLabel = null

// 🔥 NEW (restore state)
let selectedDate = null


// =============================
// 🔥 LOAD EVENTS (UNCHANGED)
// =============================

async function loadEvents(){

await waitForSupabase()

if(!eventList) return

const supabase = await window.getSupabase()
const user = await getCurrentUser()

if(!user) return

const year = currentDate.getFullYear()
const month = currentDate.getMonth()

const startDate = new Date(year, month, 1).toISOString().split('T')[0]
const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

const { data: events } =
await supabase
.from("events")
.select("*")
.eq("user_id",user.id)
.gte("event_date", startDate)
.lte("event_date", endDate)

if(!events || events.length === 0){
eventList.innerHTML = "<p>No upcoming events</p>"
return
}

const grouped = {}

events.forEach(e=>{
const date = e.event_date
if(!grouped[date]) grouped[date] = []
grouped[date].push(e)
})

eventList.innerHTML = ""

Object.keys(grouped)
.sort((a,b)=> new Date(a)-new Date(b))
.forEach(date=>{

const items = grouped[date]

const eventDate =
new Date(date).toLocaleDateString("en-IN",{
day:"numeric",
month:"long",
year:"numeric"
})

eventList.innerHTML += `
<div class="glass p-4 rounded-xl">

<p class="text-lg font-semibold mb-2">
${eventDate}
<span class="text-gray-400 text-sm">
(${items.length} events)
</span>
</p>

<div class="space-y-1">
${items.map(e=>{

let name = e.client_name || e.event_name || "Event"

return `
<div 
class="text-sm text-gray-300 cursor-pointer hover:text-white transition"
onclick="location.href='gallery.html?event_id=${e.id}'"
>
• ${name}
</div>
`

}).join("")}
</div>

</div>
`

})

}


// =============================
// CALENDAR (FIXED)
// =============================

let currentDate = new Date()

function getMonthData(year, month){
return {
firstDay: new Date(year, month, 1).getDay(),
daysInMonth: new Date(year, month + 1, 0).getDate()
}
}

async function loadCalendar(){

await waitForSupabase()

if(!calendar) return

const supabase = await window.getSupabase()
const user = await getCurrentUser()

if(!user) return

const { data: events } =
await supabase
.from("events")
.select("*")
.eq("user_id",user.id)

const eventDates = {}

;(events || []).forEach(e=>{
if(e.event_date){
eventDates[e.event_date] = true
}
})

const today = new Date()
const todayStr = today.toISOString().split("T")[0]

const { firstDay, daysInMonth } =
getMonthData(currentDate.getFullYear(), currentDate.getMonth())

calendar.innerHTML = ""

if(monthLabel){
monthLabel.innerText =
currentDate.toLocaleString("default",{month:"long",year:"numeric"})
}

for(let i=0;i<firstDay;i++){
calendar.innerHTML += `<div></div>`
}

for(let d=1; d<=daysInMonth; d++){

const fullDate =
`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

let cls = "p-2 rounded cursor-pointer transition hover:scale-105"

// 🔥 EVENT
if(eventDates[fullDate]){
cls += " bg-red-600"
}else{
cls += " bg-slate-800"
}

// 🔥 TODAY HIGHLIGHT (RESTORED)
if(fullDate === todayStr){
cls += " border-2 border-green-400"
}

// 🔥 SELECTED DATE
if(selectedDate === fullDate){
cls += " ring-2 ring-blue-400"
}

calendar.innerHTML += `
<div class="${cls}" onclick="selectDate('${fullDate}')">
${d}
</div>
`

}

}


// =============================
// 🔥 DATE CLICK HANDLER (RESTORED)
// =============================

function selectDate(date){
selectedDate = date
loadCalendar()
}


// =============================
// INIT
// =============================

async function init(){

eventList = document.getElementById("eventList")
calendar = document.getElementById("calendar")
monthLabel = document.getElementById("monthLabel")

await loadEvents()
await loadCalendar()

}

init()