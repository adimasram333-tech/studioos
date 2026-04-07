// =============================
// GLOBAL MENU SYSTEM (FINAL FIX)
// =============================

let activeMenu = null

function buildGuestDownloadLabel(isFree){
return isFree ? "Guest Free Download: ON" : "Guest Free Download: OFF"
}

function buildMenuHtml(id, guestFreeDownload){
const safeMode = guestFreeDownload ? "true" : "false"

return `
<div onclick="openEvent('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Open</div>
<div onclick="shareEvent('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Share Link</div>
<div onclick="showQR('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Show QR</div>
<div onclick="showToken('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Show Token</div>
<div onclick="toggleGuestFreeDownload('${id}', ${safeMode})" class="px-3 py-2 hover:bg-white/10 cursor-pointer">
${buildGuestDownloadLabel(guestFreeDownload)}
</div>
<div onclick="deleteEvent('${id}')" class="px-3 py-2 hover:bg-red-500/20 text-red-400 cursor-pointer">Delete Gallery</div>
`
}

function positionFloatingMenu(menu, btn){

if(!menu || !btn) return

const rect = btn.getBoundingClientRect()
const viewportWidth = window.innerWidth
const viewportHeight = window.innerHeight
const safeMargin = 8

const menuWidth = menu.offsetWidth || 180
const menuHeight = menu.offsetHeight || 220

let left = rect.right - menuWidth
let top = rect.bottom + 6

if(left < safeMargin){
left = safeMargin
}

if(left + menuWidth > viewportWidth - safeMargin){
left = viewportWidth - menuWidth - safeMargin
}

if(top + menuHeight > viewportHeight - safeMargin){
top = rect.top - menuHeight - 6
}

if(top < safeMargin){
top = safeMargin
}

menu.style.left = `${Math.max(safeMargin, left)}px`
menu.style.top = `${Math.max(safeMargin, top)}px`
}

window.toggleMenu = function(id, btn, guestFreeDownload = false){

const existing = document.getElementById("floatingMenu")

if(existing && existing.dataset.id === id){
existing.remove()
activeMenu = null
return
}

if(existing) existing.remove()

const menu = document.createElement("div")
menu.id = "floatingMenu"
menu.dataset.id = id
menu.dataset.guestFreeDownload = guestFreeDownload ? "true" : "false"

menu.style.position = "fixed"
menu.style.top = "0px"
menu.style.left = "0px"
menu.style.background = "#1a1f2e"
menu.style.border = "1px solid rgba(255,255,255,0.1)"
menu.style.borderRadius = "8px"
menu.style.fontSize = "12px"
menu.style.zIndex = 99999
menu.style.backdropFilter = "blur(10px)"
menu.style.overflow = "hidden"
menu.style.minWidth = "180px"
menu.style.maxWidth = "calc(100vw - 16px)"
menu.style.boxSizing = "border-box"

menu.innerHTML = buildMenuHtml(id, !!guestFreeDownload)

document.body.appendChild(menu)
activeMenu = menu

requestAnimationFrame(()=>{
positionFloatingMenu(menu, btn)
})

}

document.addEventListener("click",(e)=>{

if(!e.target.closest("#floatingMenu") && !e.target.closest("button") && !e.target.closest(".guest-download-toggle")){
const existing = document.getElementById("floatingMenu")
if(existing) existing.remove()
activeMenu = null
}

})

window.addEventListener("resize", ()=>{
const existing = document.getElementById("floatingMenu")
if(existing){
existing.remove()
activeMenu = null
}
})

window.addEventListener("scroll", ()=>{
const existing = document.getElementById("floatingMenu")
if(existing){
existing.remove()
activeMenu = null
}
}, true)

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
// GUEST FREE DOWNLOAD TOGGLE
// =============================

window.toggleGuestFreeDownload = async function(id, currentValue = false){

const nextValue = !currentValue
const confirmMessage = nextValue
? "Enable FREE guest downloads for this event?\n\nGuests will be able to preview and download matched photos without payment."
: "Disable FREE guest downloads for this event?\n\nGuests will need to pay before downloading matched photos."

const confirmed = confirm(confirmMessage)
if(!confirmed) return

const existingMenu = document.getElementById("floatingMenu")
if(existingMenu) existingMenu.remove()
activeMenu = null

try{

const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
alert("Please login again and try.")
return
}

const { error } = await supabase
.from("events")
.update({
guest_free_download: nextValue
})
.eq("id", String(id))
.eq("user_id", user.id)

if(error){
console.error("Guest download mode update failed:", error)
alert("Failed to update guest download mode")
return
}

alert(nextValue ? "Guest free download enabled" : "Guest free download disabled")
location.reload()

}catch(err){
console.error(err)
alert("Failed to update guest download mode")
}

}

// =============================
// DELETE SYSTEM (FULL FIX)
// =============================

window.deleteEvent = async function(id){

const confirmDelete = confirm("Delete gallery permanently?\n\nThis will remove all event photos from Cloudinary and related gallery data from Supabase.")
if(!confirmDelete) return

const existingMenu = document.getElementById("floatingMenu")
if(existingMenu) existingMenu.remove()
activeMenu = null

try{

const supabase = await window.getSupabase()

if(!supabase){
alert("Supabase not initialized")
return
}

const { data: { session } } = await supabase.auth.getSession()

if(!session){
alert("Please login again")
return
}

const response = await fetch(
"https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/smart-processor",
{
method: "POST",
headers: {
"Content-Type": "application/json",
"apikey": window.SUPABASE_ANON_KEY || "",
"Authorization": `Bearer ${session.access_token}`
},
body: JSON.stringify({ event_id: String(id) })
}
)

let result = null

try{
result = await response.json()
}catch(parseErr){
result = null
}

if(!response.ok || !result?.success){
console.error("Delete failed:", result)
alert(result?.error || "Delete failed")
return
}

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
return !!(matchedImages && matchedImages.size > 0)
}

function resolveEffectiveRole(sessionRole, currentUserId, eventOwnerId){
if(currentUserId && eventOwnerId && String(currentUserId) === String(eventOwnerId)){
return "photographer"
}
if(sessionRole === "client"){
return "client"
}
return "guest"
}

function getLowQualityPreviewUrl(url){
try{
const cleanUrl = normalizeImageUrl(url)
if(!cleanUrl.includes("/upload/")) return cleanUrl

return cleanUrl.replace(
"/upload/",
"/upload/q_30,w_800,l_text:Arial_40:StudioOS,o_50/"
)
}catch(e){
return normalizeImageUrl(url)
}
}

function getDisplayImageUrl(url, role, guestFreeDownload = false){
const cleanUrl = normalizeImageUrl(url)

if(role === "photographer" || role === "client"){
return cleanUrl
}

if(role === "guest" && guestFreeDownload){
return cleanUrl
}

return getLowQualityPreviewUrl(cleanUrl)
}

function applyGuestImageProtection(target){
if(!target) return

target.setAttribute("draggable", "false")
target.style.webkitUserDrag = "none"
target.style.userSelect = "none"

target.addEventListener("dragstart", (e)=>{
e.preventDefault()
})

target.addEventListener("contextmenu", (e)=>{
e.preventDefault()
})
}

function buildToggleMarkup(eventId, isGuestFree){
const bgColor = isGuestFree ? "#6366f1" : "rgba(255,255,255,0.28)"
const knobLeft = isGuestFree ? "22px" : "2px"

return `
<label class="guest-download-toggle inline-flex items-center cursor-pointer select-none" onclick="event.stopPropagation()">
  <input
    type="checkbox"
    class="sr-only"
    ${isGuestFree ? "checked" : ""}
    onchange="toggleGuestFreeDownload('${eventId}', ${isGuestFree ? "true" : "false"})"
  />
  <div style="
    position: relative;
    width: 40px;
    height: 20px;
    border-radius: 9999px;
    background: ${bgColor};
    transition: background 0.2s ease;
  ">
    <span style="
      position: absolute;
      top: 2px;
      left: ${knobLeft};
      width: 16px;
      height: 16px;
      border-radius: 9999px;
      background: #ffffff;
      transition: left 0.2s ease;
      display: block;
    "></span>
  </div>
</label>
`
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

const supabase = await window.getSupabase()

let user = null
try{
user = await window.getCurrentUser()
}catch(e){
user = null
}

const sessionRole = sessionStorage.getItem("role") || "guest"
const accessGranted = sessionStorage.getItem("gallery_access")
const sessionEventId = sessionStorage.getItem("event_id")
const visitorId = sessionStorage.getItem("visitor_id")

let eventName = "Event"
let eventOwnerId = null
let guestFreeDownload = false

if(eventId){
const { data: ev } = await supabase
.from("events")
.select("event_name, client_name, user_id, guest_free_download")
.eq("id", eventId)
.single()

if(ev){
eventName = ev.event_name || ev.client_name || "Event"
eventOwnerId = ev.user_id || null
guestFreeDownload = !!ev.guest_free_download
}
}

const effectiveRole = resolveEffectiveRole(
sessionRole,
user?.id || null,
eventOwnerId
)

if(effectiveRole === "photographer"){
console.log("👤 Photographer access (owner verified)")
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

// guest ke liye DB re-match allow nahi
// sirf client / photographer ke liye optional DB matching
if(userEncoding && eventId && effectiveRole !== "guest"){

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
const diff = Number(row.face_encoding[i]) - Number(userEncoding[i])
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

const isGuestFree = !!e.guest_free_download

div.innerHTML = `
<div class="flex justify-between items-start gap-3">
  <div class="min-w-0 flex-1">
    <div class="text-sm font-semibold truncate">${displayName}</div>
    <div class="text-xs text-gray-400">${date}</div>
  </div>

  <div class="flex items-center gap-2 shrink-0">
    ${buildToggleMarkup(e.id, isGuestFree)}
    <button onclick="toggleMenu('${e.id}', this, ${isGuestFree ? "true" : "false"})" class="text-xl px-1 leading-none">⋮</button>
  </div>
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
const cleanUrl = normalizeImageUrl(url)
const displayUrl = getDisplayImageUrl(cleanUrl, effectiveRole, guestFreeDownload)

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
<img id="modalImg" src="${displayUrl}" style="max-width:90%; max-height:80vh; object-fit:contain; border-radius:12px;" />
<button id="downloadBtn"
style="position:absolute; bottom:30px; background:#4f46e5; color:white; padding:8px 16px; border-radius:8px;">
Download
</button>
`

modal.onclick = (e)=>{ if(e.target === modal) modal.remove() }

document.body.appendChild(modal)

const btn = document.getElementById("downloadBtn")
const modalImg = document.getElementById("modalImg")

if(effectiveRole === "guest"){
applyGuestImageProtection(modalImg)
}

btn.onclick = async function(){

if(effectiveRole === "photographer" || effectiveRole === "client"){
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)
return
}

if(guestFreeDownload){
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)
return
}

if(typeof window.handleDownload === "function"){
window.handleDownload(cleanUrl, eventId, photographerId, eventName, {
guestFreeDownload: false
})
return
}

const previewFileName = getSafeFileName(displayUrl, "photo.jpg")
await directDownloadImage(displayUrl, previewFileName)

}

}else{
const modalImg = document.getElementById("modalImg")
modalImg.src = displayUrl

if(effectiveRole === "guest"){
applyGuestImageProtection(modalImg)
}else{
modalImg.setAttribute("draggable", "false")
}

const btn = document.getElementById("downloadBtn")
btn.onclick = async function(){

if(effectiveRole === "photographer" || effectiveRole === "client"){
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)
return
}

if(guestFreeDownload){
const fileName = getSafeFileName(cleanUrl, "photo.jpg")
await directDownloadImage(cleanUrl, fileName)
return
}

if(typeof window.handleDownload === "function"){
window.handleDownload(cleanUrl, eventId, photographerId, eventName, {
guestFreeDownload: false
})
return
}

const previewFileName = getSafeFileName(displayUrl, "photo.jpg")
await directDownloadImage(displayUrl, previewFileName)

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

const cleanUrl = normalizeImageUrl(img.image_url)
const displayUrl = getDisplayImageUrl(cleanUrl, effectiveRole, guestFreeDownload)

const div = document.createElement("div")

div.className =
"glass rounded-xl overflow-hidden cursor-pointer"

div.innerHTML = `
<img src="${displayUrl}"
class="w-full h-40 object-cover hover:scale-105 transition"/>
`

const imageEl = div.querySelector("img")

if(effectiveRole === "guest"){
applyGuestImageProtection(imageEl)
}

div.onclick = () => openImage(cleanUrl)

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