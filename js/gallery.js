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
// 🔥 FINAL PARAM FIX
// =============================

const params = new URLSearchParams(window.location.search)

// ✅ NEW PARAM
let eventId = params.get("event_id")

// ✅ BACKWARD SUPPORT (CRITICAL)
if(!eventId){
eventId = params.get("event")
}

// 🔒 LEGACY BLOCK
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

const { data: events, error } =
await supabase
.from("events")
.select("*")
.order("event_date",{ ascending:false })   // ✅ REMOVED user_id filter

if(error){
console.error("Events fetch error:", error)
empty.classList.remove("hidden")
empty.innerText = "Failed to load events"
return
}

if(!events || events.length === 0){
empty.innerText = "No events found"
empty.classList.remove("hidden")
return
}

grid.innerHTML = ""
empty.classList.add("hidden")

events.forEach(e=>{

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
window.location.href = `gallery.html?event_id=${e.id}`
}

grid.appendChild(div)

})

return

}


// =============================
// 🔥 MODE 2: IMAGE VIEW
// =============================

const safeEventId = String(eventId)

const { data, error } =
await supabase
.from("gallery_photos")
.select("*")
.eq("event_id", safeEventId)
.order("created_at",{ ascending:false })   // ✅ REMOVED user_id filter

if(error){
console.error("Gallery fetch error:",error)
empty.classList.remove("hidden")
empty.innerText = "Failed to load photos"
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