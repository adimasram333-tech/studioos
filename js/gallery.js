// =============================
// GLOBAL MENU SYSTEM (FINAL FIX)
// =============================

let activeMenu = null

window.toggleMenu = function(id, btn){

const existing = document.getElementById("floatingMenu")

if(existing && existing.dataset.id === id){
existing.remove()
activeMenu = null
return
}

if(existing) existing.remove()

const rect = btn.getBoundingClientRect()

const menu = document.createElement("div")
menu.id = "floatingMenu"
menu.dataset.id = id

menu.style.position = "fixed"
menu.style.top = rect.bottom + "px"
menu.style.left = (rect.right - 120) + "px"
menu.style.background = "#1a1f2e"
menu.style.border = "1px solid rgba(255,255,255,0.1)"
menu.style.borderRadius = "8px"
menu.style.fontSize = "12px"
menu.style.zIndex = 99999
menu.style.backdropFilter = "blur(10px)"
menu.style.overflow = "hidden"
menu.style.minWidth = "120px"

menu.innerHTML = `
<div onclick="openEvent('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Open</div>
<div onclick="shareEvent('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Share Link</div>
<div onclick="showQR('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Show QR</div>
<div onclick="showToken('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Show Token</div>
<div onclick="deleteEvent('${id}')" class="px-3 py-2 hover:bg-red-500/20 text-red-400 cursor-pointer">Delete Gallery</div>
`

document.body.appendChild(menu)
activeMenu = menu

}

document.addEventListener("click",(e)=>{

if(!e.target.closest("#floatingMenu") && !e.target.closest("button")){
const existing = document.getElementById("floatingMenu")
if(existing) existing.remove()
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

// =============================
// TOKEN SYSTEM
// =============================

window.showToken = async function(id){

const supabase = await window.getSupabase()

let { data } = await supabase
.from("event_tokens")
.select("*")
.eq("event_id", id)
.order("created_at",{ ascending:true })
.limit(1)

let token = null

if(data && data.length > 0){
token = data[0].token
}else{

const newToken = Math.random().toString(36).substring(2,8).toUpperCase()

const { data: inserted } = await supabase
.from("event_tokens")
.insert([{ event_id:id, token:newToken }])
.select()
.limit(1)

token = inserted?.[0]?.token || newToken
}

alert("Token: " + token)

}

// =============================
// DELETE SYSTEM
// =============================

window.deleteEvent = async function(id){

const confirmDelete = confirm("Delete gallery permanently?")
if(!confirmDelete) return

try{

await fetch("https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/smart-processor", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": "Bearer YOUR_KEY",
"apikey": "YOUR_KEY"
},
body: JSON.stringify({ event_id: id })
})

const supabase = await window.getSupabase()

await supabase.from("gallery_photos").delete().eq("event_id", id)
await supabase.from("event_tokens").delete().eq("event_id", id)

alert("Gallery deleted successfully")
location.reload()

}catch(err){
console.error(err)
alert("Delete failed")
}

}

// =============================
// QR
// =============================

window.showQR = function(id){

const existingMenu = document.getElementById("floatingMenu")
if(existingMenu) existingMenu.remove()

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
<canvas id="qrCanvas"></canvas>
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

const qr = new Image()
qr.crossOrigin = "anonymous"
qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`

qr.onload = function(){
const canvas = document.getElementById("qrCanvas")
const ctx = canvas.getContext("2d")
canvas.width = 200
canvas.height = 200
ctx.drawImage(qr,0,0)
}

document.getElementById("downloadQR").onclick = function(){

const canvas = document.getElementById("qrCanvas")

canvas.toBlob(function(blob){
const a = document.createElement("a")
a.href = URL.createObjectURL(blob)
a.download = "event-qr.png"
a.click()
})

}

}

// =============================
// SAFE HELPERS
// =============================

function normalizeImageUrl(url){
if(!url) return ""
return String(url).split("?")[0].trim()
}

function isMatchedImage(imgUrl, matchedImages){

if(!matchedImages || matchedImages.size === 0) return false

const cleanUrl = normalizeImageUrl(imgUrl)

for(const m of matchedImages){
if(normalizeImageUrl(m) === cleanUrl){
return true
}
}

return false
}

function resolveEffectiveRole(sessionRole, user){
if(user){
return "photographer"
}
if(sessionRole === "client"){
return "client"
}
return "guest"
}

function getSafeFileName(url, fallback = "photo.jpg"){
try{
const cleanUrl = normalizeImageUrl(url)
const rawName = cleanUrl.split("/").pop() || fallback
const decoded = decodeURIComponent(rawName)
const safeName = decoded.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim()
return safeName || fallback
}catch(e){
return fallback
}
}

function triggerBlobDownload(blob, filename){
const blobUrl = URL.createObjectURL(blob)
const a = document.createElement("a")
a.href = blobUrl
a.download = filename
document.body.appendChild(a)
a.click()
a.remove()

setTimeout(()=>{
URL.revokeObjectURL(blobUrl)
}, 3000)
}

async function directDownloadImage(url, filename = "photo.jpg"){
const cleanUrl = normalizeImageUrl(url)

try{
const response = await fetch(cleanUrl, {
method: "GET",
mode: "cors",
cache: "no-store"
})

if(!response.ok){
throw new Error("Failed to fetch file for download")
}

const blob = await response.blob()
triggerBlobDownload(blob, filename)
return true
}catch(err){
console.error("Download fallback triggered:", err)

try{
const a = document.createElement("a")
a.href = cleanUrl
a.download = filename
a.rel = "noopener"
document.body.appendChild(a)
a.click()
a.remove()
return true
}catch(linkErr){
console.error("Direct link download failed:", linkErr)
alert("Download failed. Please try again.")
return false
}
}
}

function readJsonSessionArray(key){
try{
const raw = sessionStorage.getItem(key)
if(!raw) return []
const parsed = JSON.parse(raw)
return Array.isArray(parsed) ? parsed : []
}catch(e){
return []
}
}

function readJsonSessionObject(key){
try{
const raw = sessionStorage.getItem(key)
if(!raw) return null
const parsed = JSON.parse(raw)
return parsed && typeof parsed === "object" ? parsed : null
}catch(e){
return null
}
}

function getGuestMatchedImagesFromSession(eventId){
const matched = new Set()

const directArrays = [
"matched_images",
"matched_image_urls",
"face_matched_images",
"face_match_images",
"guest_matched_images"
]

directArrays.forEach(key=>{
const values = readJsonSessionArray(key)
values.forEach(url=>{
const clean = normalizeImageUrl(url)
if(clean){
matched.add(clean)
}
})
})

const byEventMaps = [
"matched_images_by_event",
"matched_image_urls_by_event",
"face_matched_images_by_event"
]

byEventMaps.forEach(key=>{
const mapValue = readJsonSessionObject(key)
if(mapValue && eventId && Array.isArray(mapValue[eventId])){
mapValue[eventId].forEach(url=>{
const clean = normalizeImageUrl(url)
if(clean){
matched.add(clean)
}
})
}
})

return matched
}

function hasValidGuestFaceSession(eventId){
const matchedImages = getGuestMatchedImagesFromSession(eventId)

if(matchedImages && matchedImages.size > 0){
return true
}

return false
}

// =============================
// LOAD GALLERY
// =============================

async function loadGallery(){

const params = new URLSearchParams(window.location.search)

let eventId =
params.get("event_id") ||
params.get("event") ||
""

if(eventId){
sessionStorage.setItem("event_id", eventId)
}

if(eventId){
eventId = String(eventId).trim()
if(eventId === "null" || eventId === "undefined" || eventId === ""){
eventId = null
}
}else{
eventId = null
}

let user = null
try{
user = await window.getCurrentUser()
}catch(e){
user = null
}

const sessionRole = sessionStorage.getItem("role") || "guest"
const effectiveRole = resolveEffectiveRole(sessionRole, user)

const accessGranted = sessionStorage.getItem("gallery_access")
const sessionEventId = sessionStorage.getItem("event_id")
const visitorId = sessionStorage.getItem("visitor_id")

if(user){
console.log("👤 Photographer access")
}else{

if(eventId){

if(accessGranted !== "true"){
window.location.href = `access.html?event_id=${eventId}`
return
}

if(!sessionEventId || sessionEventId !== eventId){
window.location.href = `access.html?event_id=${eventId}`
return
}

if(!visitorId){
window.location.href = `access.html?event_id=${eventId}`
return
}

if(effectiveRole === "guest" && !hasValidGuestFaceSession(eventId)){
window.location.href = `access.html?event_id=${eventId}`
return
}

console.log("✅ Guest/Client verified | Role:", effectiveRole)

}

}

const supabase = await window.getSupabase()

// =============================
// FACE MATCH: GET USER FACE
// =============================

let userEncoding = null

try{
const stored = sessionStorage.getItem("face_encoding")
if(stored){
const parsed = JSON.parse(stored)
if(Array.isArray(parsed) && parsed.length > 0){
userEncoding = parsed
}
}
}catch(e){
userEncoding = null
}

let eventName = "Event"

if(eventId){
const { data: ev } = await supabase
.from("events")
.select("event_name, client_name")
.eq("id", eventId)
.single()

if(ev){
eventName = ev.event_name || ev.client_name || "Event"
}
}

console.log("FINAL EVENT ID:", eventId)

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

// =============================
// FACE MATCH: PREPARE MATCHED SET
// =============================

let matchedImages = new Set()

if(effectiveRole === "guest" && eventId){
const sessionMatchedImages = getGuestMatchedImagesFromSession(eventId)
sessionMatchedImages.forEach(url=>{
matchedImages.add(url)
})
}

if(userEncoding && eventId){

const { data: faces } = await supabase
.from("face_data")
.select("face_encoding, image_url")
.eq("event_id", eventId)

if(faces && faces.length > 0){

faces.forEach(row=>{

if(!row || !row.face_encoding || !row.image_url) return
if(!Array.isArray(row.face_encoding)) return
if(row.face_encoding.length !== userEncoding.length) return

let dist = 0

for(let i=0;i<row.face_encoding.length;i++){
const diff = row.face_encoding[i] - userEncoding[i]
dist += diff * diff
}

dist = Math.sqrt(dist)

if(dist < 0.60){
matchedImages.add(normalizeImageUrl(row.image_url))
}

})

}

}

if(!grid || !empty){
return
}

grid.innerHTML = ""

// =============================
// FOLDER VIEW
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
<button onclick="toggleMenu('${e.id}', this)" class="text-xl px-2">⋮</button>
</div>
`

grid.appendChild(div)

})

return

}

// =============================
// PHOTO VIEW
// =============================

const safeEventId = String(eventId)

const { data, error } =
await supabase
.from("gallery_photos")
.select("*")
.eq("event_id", safeEventId)
.order("created_at",{ ascending:false })

const photographerId = data && data.length > 0 ? data[0].user_id : null

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

// guest = fail closed
if(effectiveRole === "guest"){

if(matchedImages.size === 0){
empty.innerText = "No photos found for your face"
empty.classList.remove("hidden")
return
}

}

async function openImage(url){
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
<img id="modalImg" src="${url}" style="max-width:90%; max-height:80vh; object-fit:contain; border-radius:12px;" />
<button id="downloadBtn"
style="position:absolute; bottom:30px; background:#4f46e5; color:white; padding:8px 16px; border-radius:8px;">
Download
</button>
`

modal.onclick = (e)=>{ if(e.target === modal) modal.remove() }

document.body.appendChild(modal)

const btn = document.getElementById("downloadBtn")

btn.onclick = async function(){

if(effectiveRole === "photographer" || effectiveRole === "client"){
const cleanUrl = normalizeImageUrl(url)
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)
return
}

if(typeof window.handleDownload === "function"){
window.handleDownload(url, eventId, photographerId, eventName)
return
}

const cleanUrl = normalizeImageUrl(url)
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)

}

}else{
document.getElementById("modalImg").src = url

const btn = document.getElementById("downloadBtn")
btn.onclick = async function(){

if(effectiveRole === "photographer" || effectiveRole === "client"){
const cleanUrl = normalizeImageUrl(url)
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)
return
}

if(typeof window.handleDownload === "function"){
window.handleDownload(url, eventId, photographerId, eventName)
return
}

const cleanUrl = normalizeImageUrl(url)
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)

}
}
}

data.forEach(img=>{

if(!img || !img.image_url) return

if(effectiveRole === "guest"){
if(!isMatchedImage(img.image_url, matchedImages)){
return
}
}

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

if(effectiveRole === "guest" && grid.children.length === 0){
empty.innerText = "No photos found for your face"
empty.classList.remove("hidden")
}

}

document.addEventListener("DOMContentLoaded",()=>{
loadGallery()
})