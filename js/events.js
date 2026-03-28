// =============================
// SAFE WAIT FOR SUPABASE (FIXED)
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

const { data:{ user } } =
await supabase.auth.getUser()

return user

}


// =============================
// GLOBAL ELEMENTS
// =============================

let eventList = null
let calendar = null
let monthLabel = null


// =============================
// 🔥 LOAD EVENTS (FINAL FIX)
// =============================

async function loadEvents(){

await waitForSupabase()

if(!eventList) return

const supabase = await window.getSupabase()
const user = await getCurrentUser()

if(!user){
console.log("No user found")
return
}

// DATE RANGE
const year = currentDate.getFullYear()
const month = currentDate.getMonth()

const startDateObj = new Date(year, month, 1)
const endDateObj = new Date(year, month + 1, 0)

const startDate = startDateObj.toISOString().split('T')[0]
const endDate = endDateObj.toISOString().split('T')[0]

// 🔥 FETCH EVENTS
const { data: events } =
await supabase
.from("events")
.select("*")
.eq("user_id",user.id)
.gte("event_date", startDate)
.lte("event_date", endDate)

// 🔥 FETCH GALLERY EVENTS (CRITICAL)
const { data: galleryEvents } =
await supabase
.from("gallery_photos")
.select("event_id, created_at")
.eq("user_id", user.id)

const map = new Map()

;(events || []).forEach(e=>{
if(e?.id){
map.set(e.id,e)
}
})

// ADD MISSING EVENTS FROM GALLERY
;(galleryEvents || []).forEach(g=>{
if(g?.event_id && !map.has(g.event_id)){
map.set(g.event_id,{
id: g.event_id,
client_name:"Gallery Event",
event_name:"Gallery Event",
event_date: g.created_at?.split("T")[0] || ""
})
}
})

const allEvents = Array.from(map.values())

if(!allEvents.length){
eventList.innerHTML = "<p>No upcoming events</p>"
return
}

// GROUP
const grouped = {}

allEvents.forEach(e=>{
if(!e.event_date) return
if(!grouped[e.event_date]){
grouped[e.event_date] = []
}
grouped[e.event_date].push(e)
})

eventList.innerHTML = ""

const sortedDates =
Object.keys(grouped).sort(
(a,b)=> new Date(a) - new Date(b)
)

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
busyLabel = "<span class='text-red-400 text-xs ml-2'>🔥 Very Busy Day</span>"
}
else if(events.length >= 5){
busyLabel = "<span class='text-yellow-400 text-xs ml-2'>⚡ Busy Day</span>"
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
${events.map(e=>{

let name = e.client_name || e.event_name || "Event"

if(name.startsWith("Q_")){
name = e.client_name || "Booking Event"
}

return `
<div 
class="text-sm text-gray-300 cursor-pointer hover:text-white transition"
onclick="location.href='client.html?id=${e.id}'"
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
// SMART CALENDAR SYSTEM
// =============================

let currentDate = new Date()

function getMonthData(year, month){
const firstDay = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()
return { firstDay, daysInMonth }
}


// =============================
// 🔥 LOAD CALENDAR (FIXED)
// =============================

async function loadCalendar(){

await waitForSupabase()

if(!calendar) return

const supabase = await window.getSupabase()
const user = await getCurrentUser()

if(!user){
console.log("No user found")
return
}

// EVENTS
const { data: events } =
await supabase
.from("events")
.select("*")
.eq("user_id",user.id)

// GALLERY EVENTS
const { data: galleryEvents } =
await supabase
.from("gallery_photos")
.select("event_id, created_at")
.eq("user_id", user.id)

const eventDates = {}
const eventDetails = {}

;(events || []).forEach(e=>{

eventDates[e.event_date] = true

let name = e.client_name || e.event_name

if(name && name.startsWith("Q_")){
name = e.client_name || "Booking Event"
}

eventDetails[e.event_date] = eventDetails[e.event_date] || []
eventDetails[e.event_date].push(name)

})

// ADD GALLERY EVENTS
;(galleryEvents || []).forEach(g=>{

const date = g.created_at?.split("T")[0]
if(!date) return

eventDates[date] = true

eventDetails[date] = eventDetails[date] || []
eventDetails[date].push("Gallery Event")

})

const notes = JSON.parse(localStorage.getItem("calendar_notes") || "{}")

const year = currentDate.getFullYear()
const month = currentDate.getMonth()

const today = new Date()
const todayStr =
`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

const { firstDay, daysInMonth } = getMonthData(year, month)

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
`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

let classes = "p-2 rounded cursor-pointer transition hover:scale-105"

if(eventDates[fullDate]){
classes += " bg-red-600"
}
else if(notes[fullDate]){
classes += " bg-blue-600"
}
else{
classes += " bg-slate-800"
}

if(fullDate === todayStr){
classes += " ring-2 ring-green-400 shadow-lg"
}

let tooltip = ""

if(eventDetails[fullDate]){
tooltip += eventDetails[fullDate].join(", ")
}

if(notes[fullDate]){
tooltip += tooltip ? " | Note added" : "Note added"
}

calendar.innerHTML += `
<div 
class="${classes}"
title="${tooltip}"
onclick="openModal('${fullDate}')"
>
${d}
</div>
`

}

}


// =============================
// बाकी code SAME (UNCHANGED)
// =============================

const modal = document.getElementById("modal")
const noteInput = document.getElementById("noteInput")
const selectedDate = document.getElementById("selectedDate")

let activeDate = null

function openModal(date){

if(!modal) return

activeDate = date

if(selectedDate){
selectedDate.innerText = date
}

const notes = JSON.parse(localStorage.getItem("calendar_notes") || "{}")

if(noteInput){
noteInput.value = notes[date] || ""
}

modal.classList.remove("hidden")

}

function closeModal(){
if(modal){
modal.classList.add("hidden")
}
}

const saveBtn = document.getElementById("saveNote")

if(saveBtn){
saveBtn.addEventListener("click",function(){

const notes = JSON.parse(localStorage.getItem("calendar_notes") || "{}")

notes[activeDate] = noteInput.value

localStorage.setItem("calendar_notes",JSON.stringify(notes))

closeModal()

loadCalendar()

})
}

const prevBtn = document.getElementById("prevMonth")
const nextBtn = document.getElementById("nextMonth")

if(prevBtn){
prevBtn.onclick = function(){
currentDate.setMonth(currentDate.getMonth() - 1)
loadCalendar()
loadEvents()
}
}

if(nextBtn){
nextBtn.onclick = function(){
currentDate.setMonth(currentDate.getMonth() + 1)
loadCalendar()
loadEvents()
}
}

async function init(){

eventList = document.getElementById("eventList")
calendar = document.getElementById("calendar")
monthLabel = document.getElementById("monthLabel")

await loadEvents()
await loadCalendar()

}

init()