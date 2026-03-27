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
// 🔥 GET EVENT ID (SAFE FIX)
// =============================

// URL param
const params = new URLSearchParams(window.location.search)
let eventId = params.get("event")

// localStorage fallback (SAFE)
let storedEvent = localStorage.getItem("current_event")

if(!eventId && window.location.search.includes("useLocal=true")){
eventId = storedEvent
}

// ❌ BLOCK INVALID / LEGACY IDs
if(eventId && typeof eventId === "string" && eventId.startsWith("legacy_")){
eventId = null
}


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
.from("quotations")
.select("id, client_name, event_date")
.eq("user_id", user.id)
.eq("status","confirmed")
.order("event_date",{ascending:false})

if(error){
console.error("Event fetch error:", error)
return
}

if(!events || events.length === 0){
empty.classList.remove("hidden")
return
}

empty.classList.add("hidden")

events.forEach(e=>{

if(!e || !e.id) return

const div = document.createElement("div")

div.className =
"glass rounded-xl p-3 cursor-pointer hover:scale-105 transition"

const date =
new Date(e.event_date).toLocaleDateString("en-IN")

div.innerHTML = `
<div class="text-sm font-semibold">${e.client_name || "Unnamed"}</div>
<div class="text-xs text-gray-400">${date}</div>
`

div.onclick = () => {

localStorage.setItem("current_event", e.id)

window.location.href = `gallery.html?event=${e.id}`

}

grid.appendChild(div)

})

return

}


// =============================
// 🔥 MODE 2: IMAGE VIEW
// =============================

const { data, error } =
await supabase
.from("gallery_photos")
.select("*")
.eq("event_id", eventId)
.eq("user_id", user.id)
.order("created_at",{ ascending:false })

if(error){
console.error("Gallery fetch error:",error)
return
}


// =============================
// UI RENDER
// =============================

if(!data || data.length === 0){
empty.classList.remove("hidden")
return
}

empty.classList.add("hidden")

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