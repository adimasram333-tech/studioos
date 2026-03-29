// =============================
// LOAD GALLERY
// =============================

async function loadGallery(){

const params = new URLSearchParams(window.location.search)
let eventIdCheck = params.get("event_id") || params.get("event")

// =============================
// GET USER (SAFE)
// =============================

let user = null
try{
user = await window.getCurrentUser()
}catch(e){
user = null
}

// =============================
// 🔒 ACCESS CONTROL
// =============================

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

// =============================
// CONTINUE NORMAL FLOW
// =============================

const supabase = await window.getSupabase()

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
return
}

grid.innerHTML = ""

// =============================
// MODE 1: EVENT LIST (ONLY USER)
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
"glass rounded-xl p-3 relative hover:scale-105 transition"

// =============================
// EVENT DATA
// =============================

const date =
e.event_date ? new Date(e.event_date).toLocaleDateString("en-IN") : ""

let displayName = e.client_name || e.event_name || "Event"

if(displayName && displayName.startsWith("Q_")){
displayName = e.client_name || "Booking Event"
}

// =============================
// 3 DOT MENU HTML
// =============================

div.innerHTML = `
<div class="flex justify-between items-start">
  <div>
    <div class="text-sm font-semibold">${displayName}</div>
    <div class="text-xs text-gray-400">${date}</div>
  </div>

  <div class="relative">
    <button class="menuBtn text-xl px-2">⋮</button>

    <div class="menu hidden absolute right-0 mt-2 w-40 glass rounded-lg p-2 z-50">
      <div class="menuItem cursor-pointer p-2 hover:bg-white/10">Open</div>
      <div class="menuItem cursor-pointer p-2 hover:bg-white/10">Share Link</div>
      <div class="menuItem cursor-pointer p-2 hover:bg-white/10">Show QR</div>
    </div>
  </div>
</div>
`

// =============================
// ACTIONS
// =============================

const menuBtn = div.querySelector(".menuBtn")
const menu = div.querySelector(".menu")
const items = div.querySelectorAll(".menuItem")

menuBtn.onclick = (ev)=>{
ev.stopPropagation()
document.querySelectorAll(".menu").forEach(m=>m.classList.add("hidden"))
menu.classList.toggle("hidden")
}

// CLOSE MENU GLOBAL
document.addEventListener("click",()=>{
menu.classList.add("hidden")
})

// OPEN
items[0].onclick = ()=>{
window.location.href = `gallery.html?event_id=${e.id}`
}

// SHARE LINK
items[1].onclick = ()=>{
const link = `${window.location.origin}/studioos/access.html?event_id=${e.id}`
navigator.clipboard.writeText(link)
alert("Link copied")
}

// SHOW QR
items[2].onclick = ()=>{
const link = `${window.location.origin}/studioos/access.html?event_id=${e.id}`

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
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}"/>
  <div style="margin-top:10px; font-size:12px; color:#aaa">Scan to access gallery</div>
</div>
`

modal.onclick = ()=> modal.remove()
document.body.appendChild(modal)
}

grid.appendChild(div)

})

return

}

// =============================
// MODE 2: IMAGE VIEW (UNCHANGED)
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