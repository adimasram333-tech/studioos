// =============================
// GLOBAL MENU FUNCTIONS (FIXED)
// =============================

let activeMenu = null

window.toggleMenu = function(id){

const menu = document.getElementById("menu-" + id)
if(!menu) return

// if same menu clicked → toggle
if(activeMenu === menu){
menu.classList.add("hidden")
activeMenu = null
return
}

// close all
document.querySelectorAll('[id^="menu-"]').forEach(m=>{
m.classList.add("hidden")
})

// open current
menu.classList.remove("hidden")
activeMenu = menu

}

// outside click close
document.addEventListener("click",(e)=>{

if(!e.target.closest("[id^='menu-']") && !e.target.closest("button")){
document.querySelectorAll('[id^="menu-"]').forEach(m=>{
m.classList.add("hidden")
})
activeMenu = null
}

})

window.openEvent = function(id){
window.location.href = `gallery.html?event_id=${id}`
}

window.shareEvent = function(id){
const link = `${window.location.origin}/studioos/access.html?event_id=${id}`
navigator.clipboard.writeText(link)
alert("Link copied")
}

window.showQR = function(id){

const link = `${window.location.origin}/studioos/access.html?event_id=${id}`

let modal = document.createElement("div")

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
<div style="background:#111; padding:20px; border-radius:12px; text-align:center">
<img id="qrImage" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}"/>
<div style="margin-top:10px; font-size:12px; color:#aaa">Scan to access gallery</div>

<button id="downloadQR"
style="margin-top:12px; background:#4f46e5; color:white; padding:6px 12px; border-radius:8px; font-size:12px">
Download QR
</button>

</div>
`

modal.onclick = (e)=>{
if(e.target === modal){
modal.remove()
}
}

document.body.appendChild(modal)

// download logic
document.getElementById("downloadQR").onclick = function(){

const img = document.getElementById("qrImage")

const a = document.createElement("a")
a.href = img.src
a.download = "event-qr.png"
a.click()

}

}


// =============================
// LOAD GALLERY
// =============================

async function loadGallery(){

const params = new URLSearchParams(window.location.search)
let eventIdCheck = params.get("event_id") || params.get("event")

let user = null
try{
user = await window.getCurrentUser()
}catch(e){
user = null
}

const accessGranted = sessionStorage.getItem("gallery_access")
const sessionEventId = sessionStorage.getItem("event_id")
const visitorId = sessionStorage.getItem("visitor_id")

if(user){
console.log("👤 Photographer access")
}else{

if(eventIdCheck){

if(accessGranted !== "true"){
window.location.href = `access.html?event_id=${eventIdCheck}`
return
}

if(!sessionEventId || sessionEventId !== eventIdCheck){
window.location.href = `access.html?event_id=${eventIdCheck}`
return
}

if(!visitorId){
window.location.href = `access.html?event_id=${eventIdCheck}`
return
}

console.log("✅ Guest verified")

}

}

const supabase = await window.getSupabase()

let eventId = params.get("event_id")

if(!eventId){
eventId = params.get("event")
}

if(eventId && typeof eventId === "string" && eventId.startsWith("legacy_")){
eventId = null
}

console.log("FINAL EVENT ID:", eventId)

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

if(!grid || !empty){
return
}

grid.innerHTML = ""

// =============================
// MODE 1: EVENT LIST
// =============================

if(!eventId){

if(!user){
window.location.href = "access.html"
return
}

const { data: events, error } =
await supabase
.from("events")
.select("*")
.eq("user_id", user.id)
.order("event_date",{ ascending:false })

if(error){
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
"glass rounded-xl p-3 relative overflow-visible hover:scale-105 transition"

const date =
e.event_date ? new Date(e.event_date).toLocaleDateString("en-IN") : ""

let displayName = e.client_name || e.event_name || "Event"

if(displayName && displayName.startsWith("Q_")){
displayName = e.client_name || "Booking Event"
}

div.innerHTML = `

<div class="flex justify-between items-center">

<div>
<div class="text-sm font-semibold">${displayName}</div>
<div class="text-xs text-gray-400">${date}</div>
</div>

<button onclick="toggleMenu('${e.id}')" class="text-xl px-2">⋮</button>

</div>

<div id="menu-${e.id}"
class="hidden absolute right-2 top-10 bg-[#1a1f2e] border border-white/10 rounded-md text-xs shadow-xl z-[99999] backdrop-blur-md overflow-visible">

<div onclick="openEvent('${e.id}')"
class="px-3 py-1 hover:bg-white/10 cursor-pointer">
Open
</div>

<div onclick="shareEvent('${e.id}')"
class="px-3 py-1 hover:bg-white/10 cursor-pointer">
Share Link
</div>

<div onclick="showQR('${e.id}')"
class="px-3 py-1 hover:bg-white/10 cursor-pointer">
Show QR
</div>

</div>

`

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
empty.classList.remove("hidden")
empty.innerText = "Failed to load photos"
return
}

grid.innerHTML = ""
empty.classList.add("hidden")

if(!data || data.length === 0){
empty.innerText = "No photos uploaded for this event"
empty.classList.remove("hidden")
return
}

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