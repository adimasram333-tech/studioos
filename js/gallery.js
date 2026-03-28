// =============================
// LOAD GALLERY
// =============================

async function loadGallery(){

// 🔒 SECURITY CHECK (NEW)
const params = new URLSearchParams(window.location.search)
let eventIdCheck = params.get("event_id") || params.get("event")

const accessGranted = sessionStorage.getItem("gallery_access")

if(eventIdCheck && accessGranted !== "true"){
console.warn("⚠️ Unauthorized access blocked")

window.location.href = `access.html?event_id=${eventIdCheck}`
return
}

// =============================
// CONTINUE NORMAL FLOW
// =============================

const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!user){
console.error("User not found")
return
}


// =============================
// PARAMS
// =============================

let eventId = params.get("event_id")

if(!eventId){
eventId = params.get("event")
}

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
// MODE 1: EVENT LIST
// =============================

if(!eventId){

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
// MODE 2: IMAGE VIEW
// =============================

const safeEventId = String(eventId)

const { data, error } =
await supabase
.from("gallery_photos")
.select("*")
.eq("event_id", safeEventId)
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


// =============================
// IMAGE MODAL
// =============================

function openImage(url){
let modal = document.getElementById("imageModal")

if(!modal){
modal = document.createElement("div")
modal.id = "imageModal"
modal.style.position = "fixed"
modal.style.top = 0
modal.style.left = 0
modal.style.width = "100%"
modal.style.height = "100%"
modal.style.background = "rgba(0,0,0,0.9)"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.zIndex = 9999

modal.innerHTML = `
<img src="${url}" style="max-width:90%; max-height:90%; border-radius:12px;" />
`

modal.onclick = () => modal.remove()

document.body.appendChild(modal)
}else{
modal.querySelector("img").src = url
}
}


// =============================
// RENDER IMAGES
// =============================

data.forEach(img=>{

if(!img || !img.image_url) return

const div = document.createElement("div")

div.className =
"glass rounded-xl overflow-hidden cursor-pointer"

div.innerHTML = `
<img src="${img.image_url}"
class="w-full h-40 object-cover hover:scale-105 transition"/>
`

div.onclick = () => openImage(img.image_url)

grid.appendChild(div)

})

}


// =============================
// AUTO INIT
// =============================

document.addEventListener("DOMContentLoaded",()=>{
loadGallery()
})