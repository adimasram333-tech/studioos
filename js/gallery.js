// =============================
// LOAD GALLERY
// =============================

async function loadGallery(){

const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!user){
console.error("User not found")
return
}


// =============================
// 🔥 GET EVENT ID (SUPER SAFE FIX)
// =============================

const params = new URLSearchParams(window.location.search)
let eventId = params.get("event")

const storedEvent = localStorage.getItem("current_event")

// ✅ FIX 1: Always fallback if missing
if(!eventId && storedEvent){
eventId = storedEvent
}

// ✅ FIX 2: Save again if URL has it
if(eventId){
localStorage.setItem("current_event", eventId)
}

// ❌ REMOVE legacy सिस्टम
if(eventId && typeof eventId === "string" && eventId.startsWith("legacy_")){
eventId = null
}

console.log("FINAL EVENT ID:", eventId)


// =============================
// ELEMENTS
// =============================

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

if(!grid || !empty){
console.error("Gallery DOM missing")
return
}

grid.innerHTML = ""


// =============================
// 🔥 MODE 1: EVENT LIST
// =============================

if(!eventId){

const { data: events } =
await supabase
.from("events")
.select("*")
.eq("user_id", user.id)

const { data: galleryEvents } =
await supabase
.from("gallery_photos")
.select("event_id")
.eq("user_id", user.id)

const eventIdsFromGallery =
[...new Set((galleryEvents || []).map(g=>g.event_id))]

const map = new Map()

;(events || []).forEach(e=>{
if(e?.id){
map.set(String(e.id), e)
}
})

// ✅ FIX: ensure type consistency
eventIdsFromGallery.forEach(id=>{
const safeId = String(id)
if(!map.has(safeId)){
map.set(safeId,{
id: safeId,
client_name:"Gallery Event",
event_name:"Gallery Event",
event_date:""
})
}
})

const allEvents = Array.from(map.values())

grid.innerHTML = ""
empty.classList.add("hidden")

if(!allEvents.length){
empty.classList.remove("hidden")
return
}

allEvents.forEach(e=>{

if(!e || !e.id) return

const div = document.createElement("div")

div.className =
"glass rounded-xl p-3 cursor-pointer hover:scale-105 transition"

const date =
e.event_date ? new Date(e.event_date).toLocaleDateString("en-IN") : ""

let displayName = e.client_name || e.event_name || "Event"

if(displayName && displayName.startsWith("Q_")){
displayName = e.client_name || "Booking Event"
}

div.innerHTML = `
<div class="text-sm font-semibold">${displayName}</div>
<div class="text-xs text-gray-400">${date}</div>
`

div.onclick = () => {

localStorage.setItem("current_event", String(e.id))

// ✅ FIX: force correct navigation
window.location.href = `gallery.html?event=${e.id}`

}

grid.appendChild(div)

})

return

}


// =============================
// 🔥 MODE 2: IMAGE VIEW
// =============================

if(!eventId){
empty.classList.remove("hidden")
return
}

// ✅ FIX: convert to string always
const safeEventId = String(eventId)

const { data, error } =
await supabase
.from("gallery_photos")
.select("*")
.eq("event_id", safeEventId)
.eq("user_id", user.id)
.order("created_at",{ ascending:false })

if(error){
console.error("Gallery fetch error:",error)
return
}


// =============================
// UI RENDER
// =============================

grid.innerHTML = ""
empty.classList.add("hidden")

if(!data || data.length === 0){

empty.innerText = "No photos uploaded for this event"
empty.classList.remove("hidden")
return

}

data.forEach(img=>{

if(!img || !img.image_url) return

const div = document.createElement("div")

div.className =
"glass rounded-xl overflow-hidden cursor-pointer"

div.innerHTML = `
<img src="${img.image_url}"
class="w-full h-40 object-cover hover:scale-105 transition"/>
`

grid.appendChild(div)

})

}


// =============================
// AUTO INIT
// =============================

document.addEventListener("DOMContentLoaded",()=>{

loadGallery()

})