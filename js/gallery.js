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
// 🔥 GET EVENT ID (CONTROLLED FIX)
// =============================

const params = new URLSearchParams(window.location.search)

// ✅ FIX: standard param
let eventId = params.get("event_id")

// 🔒 KEEP: legacy protection (safe)
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

// ✅ ONLY events table (REMOVE fake merge)
const { data: events, error } =
await supabase
.from("events")
.select("*")
.eq("user_id", user.id)
.order("event_date",{ ascending:false })

if(error){
console.error("Events fetch error:", error)
empty.classList.remove("hidden")
empty.innerText = "Failed to load events"
return
}

grid.innerHTML = ""
empty.classList.add("hidden")

if(!events || events.length === 0){
empty.innerText = "No events found"
empty.classList.remove("hidden")
return
}

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

// ✅ FIX: only URL navigation
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

// ❗ SAFETY
if(!eventId){
empty.classList.remove("hidden")
return
}

// ✅ SAFE STRING
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