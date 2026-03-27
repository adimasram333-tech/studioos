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
// ORIGINAL EVENT LIST
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

const { data , error } =
await supabase
.from("quotations")
.select("*")
.eq("user_id",user.id)
.eq("status","confirmed")
.order("event_date",{ascending:true})

if(error){
eventList.innerHTML = "<p>Error loading events</p>"
return
}

if(!data || data.length === 0){
eventList.innerHTML = "<p>No upcoming events</p>"
return
}

const grouped = {}

data.forEach(e=>{
const date = e.event_date
if(!grouped[date]){
grouped[date] = []
}
grouped[date].push(e)
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
// SMART CALENDAR SYSTEM
// =============================

let currentDate = new Date()

function getMonthData(year, month){
const firstDay = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()
return { firstDay, daysInMonth }
}


// =============================
// LOAD CALENDAR
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

// FETCH EVENTS
const { data } =
await supabase
.from("quotations")
.select("*")
.eq("user_id",user.id)
.eq("status","confirmed")

const eventDates = {}
const eventDetails = {}

if(data){
data.forEach(e=>{
eventDates[e.event_date] = true
eventDetails[e.event_date] = {
name: e.client_name,
amount: e.total
}
})
}

// LOAD NOTES
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

// EMPTY CELLS
for(let i=0;i<firstDay;i++){
calendar.innerHTML += `<div></div>`
}

// DAYS
for(let d=1; d<=daysInMonth; d++){

const fullDate =
`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

let classes = "p-2 rounded cursor-pointer transition hover:scale-105"

// PRIORITY LOGIC
if(eventDates[fullDate]){
classes += " bg-red-600"
}
else if(notes[fullDate]){
classes += " bg-blue-600"
}
else{
classes += " bg-slate-800"
}

// TODAY
if(fullDate === todayStr){
classes += " ring-2 ring-green-400 shadow-lg"
}

// TOOLTIP
let tooltip = ""

if(eventDetails[fullDate]){
tooltip += `${eventDetails[fullDate].name} • ₹${eventDetails[fullDate].amount}`
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
// NOTES SYSTEM
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


// =============================
// MONTH NAVIGATION
// =============================

const prevBtn = document.getElementById("prevMonth")
const nextBtn = document.getElementById("nextMonth")

if(prevBtn){
prevBtn.onclick = function(){
currentDate.setMonth(currentDate.getMonth() - 1)
loadCalendar()
}
}

if(nextBtn){
nextBtn.onclick = function(){
currentDate.setMonth(currentDate.getMonth() + 1)
loadCalendar()
}
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