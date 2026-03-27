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
// 🔥 GET EVENT ID (FIXED)
// =============================

// 1. URL param
const params = new URLSearchParams(window.location.search)
let eventId = params.get("event")

// 2. fallback to localStorage (SAFE USE)
let storedEvent = localStorage.getItem("current_event")

// ⚠️ FIX: Only use localStorage when explicitly needed
if(!eventId && window.location.search.includes("useLocal=true")){
eventId = storedEvent
}


// =============================
// ELEMENTS
// =============================

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

grid.innerHTML = ""


// =============================
// 🔥 MODE 1: EVENT LIST (NEW)
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

const div = document.createElement("div")

div.className =
"glass rounded-xl p-3 cursor-pointer hover:scale-105 transition"

const date =
new Date(e.event_date).toLocaleDateString("en-IN")

div.innerHTML = `
<div class="text-sm font-semibold">${e.client_name}</div>
<div class="text-xs text-gray-400">${date}</div>
`

div.onclick = () => {

// Save for optional reuse
localStorage.setItem("current_event", e.id)

// Navigate
window.location.href = `gallery.html?event=${e.id}`

}

grid.appendChild(div)

})

return

}


// =============================
// FETCH DATA (EXISTING)
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
// UI RENDER (EXISTING)
// =============================

if(!data || data.length === 0){
empty.classList.remove("hidden")
return
}

empty.classList.add("hidden")

data.forEach(img=>{

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