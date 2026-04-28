// =============================
// GLOBAL MENU SYSTEM (S3 ONLY)
// =============================

let activeMenu = null
let FACE_FILTER_ACTIVE = false
let CURRENT_GALLERY_STATE = {
eventId: null,
effectiveRole: "guest",
matchedImages: new Set()
}

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

function removeEventCardFromDom(id){
const safeId = String(id || "").trim()
if(!safeId) return false

const card = document.querySelector(`[data-gallery-event-id="${CSS.escape(safeId)}"]`)
if(card){
card.remove()
}

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

if(grid && grid.children.length === 0 && empty){
empty.innerText = "No events found"
empty.classList.remove("hidden")
}

return !!card
}

function clearDeletedEventSession(id){
const safeId = String(id || "").trim()
if(!safeId) return

const storedEventId = sessionStorage.getItem("event_id")
if(storedEventId && String(storedEventId) === safeId){
sessionStorage.removeItem("event_id")
}

const eventScopedKeys = [
"gallery_access",
"visitor_id",
"face_encoding",
"matched_images",
"matched_image_urls",
"face_matched_images",
"face_match_images",
"guest_matched_images",
"matched_images_by_event",
"matched_image_urls_by_event",
"face_matched_images_by_event",
"face_scan_done",
"face_scan_event_id",
"face_verified"
]

eventScopedKeys.forEach(key=>{
try{
sessionStorage.removeItem(key)
}catch(e){}
})
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

window.openEvent = async function(id){

const safeId = String(id || "").trim()
if(!safeId){
alert("Invalid event")
return
}

try{
const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
alert("Please login again")
return
}

const { data: ev, error } = await supabase
.from("events")
.select("id,user_id")
.eq("id", safeId)
.eq("user_id", user.id)
.maybeSingle()

if(error){
console.error("Event validation failed:", error)
alert("Failed to open event")
return
}

if(!ev){
removeEventCardFromDom(safeId)
clearDeletedEventSession(safeId)
alert("This event was already deleted or no longer exists.")
return
}

window.location.href = `gallery.html?event_id=${safeId}`
}catch(err){
console.error("Open event failed:", err)
alert("Failed to open event")
}
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
// DELETE SYSTEM
// =============================

window.deleteEvent = async function(id){

const confirmDelete = confirm("Delete gallery permanently?\n\nThis will remove all event photos and related gallery data.")
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
"https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/delete-gallery",
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

clearDeletedEventSession(id)
removeEventCardFromDom(id)

alert("Gallery deleted successfully")

const params = new URLSearchParams(window.location.search)
const activeEventId = params.get("event_id") || params.get("event") || ""

if(activeEventId && String(activeEventId) === String(id)){
window.location.href = "gallery.html"
}

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

function getPhotoOriginalUrl(photo){
if(!photo) return ""

if(typeof window.getBestMediaUrl === "function"){
const best = window.getBestMediaUrl(photo, "original")
if(best) return normalizeImageUrl(best)
}

if(typeof window.buildMediaUrl === "function" && photo.object_key){
return normalizeImageUrl(window.buildMediaUrl(photo.object_key))
}

return ""
}

function getPhotoPreviewUrl(photo){
if(!photo) return ""

if(typeof window.getBestMediaUrl === "function"){
const preview = window.getBestMediaUrl(photo, "preview")
if(preview) return normalizeImageUrl(preview)
}

if(photo.preview_key && typeof window.buildMediaUrl === "function"){
return normalizeImageUrl(window.buildMediaUrl(photo.preview_key))
}

return getPhotoOriginalUrl(photo)
}

function getPhotoThumbnailUrl(photo){
if(!photo) return ""

if(typeof window.getBestMediaUrl === "function"){
const thumb = window.getBestMediaUrl(photo, "thumbnail")
if(thumb) return normalizeImageUrl(thumb)
}

if(photo.thumbnail_key && typeof window.buildMediaUrl === "function"){
return normalizeImageUrl(window.buildMediaUrl(photo.thumbnail_key))
}

return getPhotoPreviewUrl(photo)
}

function isMatchedImage(imgUrl, matchedImages){

if(!matchedImages || matchedImages.size === 0) return false

const cleanUrl = normalizeImageUrl(imgUrl)
const cleanPath = cleanUrl
  .replace(/^https?:\/\/[^/]+\//i, "")
  .replace(/^\/+/, "")

for(const m of matchedImages){
const cleanMatch = normalizeImageUrl(m)
const cleanMatchPath = cleanMatch
  .replace(/^https?:\/\/[^/]+\//i, "")
  .replace(/^\/+/, "")

if(cleanMatch === cleanUrl || cleanMatchPath === cleanPath){
return true
}

if(cleanPath && cleanMatchPath && (cleanUrl.endsWith(cleanMatchPath) || cleanMatch.endsWith(cleanPath))){
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
const safeEventId = String(eventId || "").trim()
const scanEventId = String(sessionStorage.getItem("face_scan_event_id") || "").trim()

const byEventMaps = [
"matched_images_by_event",
"matched_image_urls_by_event",
"face_matched_images_by_event"
]

byEventMaps.forEach(key=>{
const mapValue = readJsonSessionObject(key)
if(mapValue && safeEventId && Array.isArray(mapValue[safeEventId])){
mapValue[safeEventId].forEach(url=>{
const clean = normalizeImageUrl(url)
if(clean){
matched.add(clean)
}
})
}
})

if(matched.size > 0){
return matched
}

// Backward compatibility: direct arrays are accepted only when they belong to the same event.
if(scanEventId && safeEventId && scanEventId !== safeEventId){
return matched
}

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

function getGuestPreviewUrl(photo){
const previewUrl = getPhotoPreviewUrl(photo)
if(previewUrl) return previewUrl
return getPhotoOriginalUrl(photo)
}

function getDisplayImageUrl(photo, role, guestFreeDownload = false){
const originalUrl = getPhotoOriginalUrl(photo)
const previewUrl = getPhotoPreviewUrl(photo)

if(role === "photographer" || role === "client"){
return previewUrl || originalUrl
}

if(role === "guest" && guestFreeDownload){
return previewUrl || originalUrl
}

return previewUrl || originalUrl
}

function getModalImagesList(photos, effectiveRole, matchedImages, faceFilterActive){
return (photos || []).filter(photo => {
const cleanOriginalUrl = getPhotoOriginalUrl(photo)
if(!cleanOriginalUrl) return false

if(effectiveRole === "guest"){
if(!isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}
}

if(effectiveRole === "client" && faceFilterActive){
if(!isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}
}

return true
})
}

function getVisibleGalleryPhotos(photos, effectiveRole, matchedImages, faceFilterActive){
return (photos || []).filter(photo => {
const cleanOriginalUrl = getPhotoOriginalUrl(photo)
if(!cleanOriginalUrl) return false

if(effectiveRole === "guest" && !isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}

if(effectiveRole === "client" && faceFilterActive && !isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}

return true
})
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

function getClientFaceScanUrl(eventId){
const redirectUrl = `${window.location.origin}/studioos/gallery.html?event_id=${eventId}`
return `face-capture.html?event_id=${encodeURIComponent(eventId)}&role=client&redirect=${encodeURIComponent(redirectUrl)}`
}

function updateFaceActionButton(){

const btn = document.getElementById("faceActionBtn")
if(!btn) return

const { eventId, effectiveRole, matchedImages } = CURRENT_GALLERY_STATE

if(!eventId || effectiveRole !== "client"){
btn.classList.add("hidden")
btn.onclick = null
return
}

btn.classList.remove("hidden")

if(matchedImages && matchedImages.size > 0){
btn.innerText = FACE_FILTER_ACTIVE ? "Show Full Gallery" : "Show My Photos"
btn.onclick = function(){
FACE_FILTER_ACTIVE = !FACE_FILTER_ACTIVE
loadGallery()
}
}else{
FACE_FILTER_ACTIVE = false
btn.innerText = "Face Scan"
btn.onclick = function(){
window.location.href = getClientFaceScanUrl(eventId)
}
}

}

function updateUploadButton(effectiveRole){

const uploadBtn = document.getElementById("uploadBtn")
if(!uploadBtn) return

if(effectiveRole === "photographer"){
uploadBtn.classList.remove("hidden")
uploadBtn.disabled = false
}else{
uploadBtn.classList.add("hidden")
uploadBtn.disabled = true
}
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
const { data: ev, error: eventFetchError } = await supabase
.from("events")
.select("event_name, client_name, user_id, guest_free_download")
.eq("id", eventId)
.maybeSingle()

if(eventFetchError){
console.error("Event fetch failed:", eventFetchError)
}

if(ev){
eventName = ev.event_name || ev.client_name || "Event"
eventOwnerId = ev.user_id || null
guestFreeDownload = !!ev.guest_free_download
}else{
clearDeletedEventSession(eventId)

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

if(grid){
grid.innerHTML = ""
}

if(empty){
empty.innerText = "This event was deleted or no longer exists"
empty.classList.remove("hidden")
}

updateUploadButton("photographer")

if(user){
setTimeout(()=>{
window.location.href = "gallery.html"
}, 900)
}else{
setTimeout(()=>{
window.location.href = "access.html"
}, 900)
}

return
}
}

const effectiveRole = resolveEffectiveRole(
sessionRole,
user?.id || null,
eventOwnerId
)

updateUploadButton(effectiveRole)

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

console.log("FINAL EVENT ID:", eventId)

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

let matchedImages = new Set()

if(effectiveRole === "guest" && eventId){
const sessionMatchedImages = getGuestMatchedImagesFromSession(eventId)
sessionMatchedImages.forEach(url=>{
matchedImages.add(url)
})
}

if(effectiveRole === "client" && eventId){
const sessionMatchedImages = getGuestMatchedImagesFromSession(eventId)
sessionMatchedImages.forEach(url=>{
matchedImages.add(url)
})
}

CURRENT_GALLERY_STATE = {
eventId,
effectiveRole,
matchedImages
}

updateFaceActionButton()

if(!grid || !empty){
return
}

grid.innerHTML = ""
empty.classList.add("hidden")

if(!eventId){

const faceBtn = document.getElementById("faceActionBtn")
if(faceBtn){
faceBtn.classList.add("hidden")
faceBtn.onclick = null
}

updateUploadButton("photographer")

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
div.dataset.galleryEventId = String(e.id)

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

const safeEventId = String(eventId)

const { data, error } =
await supabase
.from("gallery_photos")
.select("id,user_id,event_id,object_key,preview_key,thumbnail_key,created_at")
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

if(effectiveRole === "guest"){
if(matchedImages.size === 0){
empty.innerText = "No photos found for your face"
empty.classList.remove("hidden")
return
}
}

const visiblePhotos = getVisibleGalleryPhotos(data, effectiveRole, matchedImages, FACE_FILTER_ACTIVE)
const modalPhotos = visiblePhotos
let currentModalIndex = -1

function updateModalButtonStates(){
const prevBtn = document.getElementById("prevImageBtn")
const nextBtn = document.getElementById("nextImageBtn")

if(!prevBtn || !nextBtn) return

const hasPrev = currentModalIndex > 0
const hasNext = currentModalIndex >= 0 && currentModalIndex < modalPhotos.length - 1

prevBtn.disabled = !hasPrev
nextBtn.disabled = !hasNext
prevBtn.style.opacity = hasPrev ? "1" : "0.4"
nextBtn.style.opacity = hasNext ? "1" : "0.4"
}

function renderModalPhoto(photo){
const cleanOriginalUrl = getPhotoOriginalUrl(photo)
const displayUrl = getDisplayImageUrl(photo, effectiveRole, guestFreeDownload)
const modalImg = document.getElementById("modalImg")
const btn = document.getElementById("downloadBtn")

if(!modalImg || !btn) return

modalImg.src = displayUrl

if(effectiveRole === "guest"){
applyGuestImageProtection(modalImg)
}else{
modalImg.setAttribute("draggable", "false")
}

btn.onclick = async function(){

if(effectiveRole === "photographer" || effectiveRole === "client"){
const fileName = getSafeFileName(cleanOriginalUrl, "photo.jpg")
await directDownloadImage(cleanOriginalUrl, fileName)
return
}

if(guestFreeDownload){
const fileName = getSafeFileName(cleanOriginalUrl, "photo.jpg")
await directDownloadImage(cleanOriginalUrl, fileName)
return
}

if(typeof window.handleDownload === "function"){
window.handleDownload(cleanOriginalUrl, eventId, photographerId, eventName, {
guestFreeDownload: false,
previewUrl: getGuestPreviewUrl(photo),
photo
})
return
}

const previewFileName = getSafeFileName(displayUrl, "photo.jpg")
await directDownloadImage(displayUrl, previewFileName)

}

updateModalButtonStates()
}

function showPrevImage(){
if(currentModalIndex <= 0) return
currentModalIndex -= 1
renderModalPhoto(modalPhotos[currentModalIndex])
}

function showNextImage(){
if(currentModalIndex < 0 || currentModalIndex >= modalPhotos.length - 1) return
currentModalIndex += 1
renderModalPhoto(modalPhotos[currentModalIndex])
}

async function openImage(photo){
currentModalIndex = modalPhotos.findIndex(item => getPhotoOriginalUrl(item) === getPhotoOriginalUrl(photo))
if(currentModalIndex < 0){
currentModalIndex = 0
}
if(!modalPhotos.length){
return
}

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
<button id="prevImageBtn"
style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(79,70,229,0.85); color:white; width:42px; height:42px; border-radius:9999px; font-size:22px; display:flex; align-items:center; justify-content:center;">‹</button>

<img id="modalImg" src="" style="max-width:90%; max-height:80vh; object-fit:contain; border-radius:12px;" />

<button id="nextImageBtn"
style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(79,70,229,0.85); color:white; width:42px; height:42px; border-radius:9999px; font-size:22px; display:flex; align-items:center; justify-content:center;">›</button>

<button id="downloadBtn"
style="position:absolute; bottom:30px; background:#4f46e5; color:white; padding:8px 16px; border-radius:8px;">
Download
</button>
`

modal.onclick = (e)=>{ if(e.target === modal) modal.remove() }

document.body.appendChild(modal)

document.getElementById("prevImageBtn").onclick = function(e){
e.stopPropagation()
showPrevImage()
}

document.getElementById("nextImageBtn").onclick = function(e){
e.stopPropagation()
showNextImage()
}

document.addEventListener("keydown", function modalKeyHandler(e){
const imageModal = document.getElementById("imageModal")
if(!imageModal) return

if(e.key === "ArrowLeft"){
showPrevImage()
}
if(e.key === "ArrowRight"){
showNextImage()
}
if(e.key === "Escape"){
imageModal.remove()
document.removeEventListener("keydown", modalKeyHandler)
}
})

renderModalPhoto(modalPhotos[currentModalIndex])

}else{
renderModalPhoto(modalPhotos[currentModalIndex])
}
}

const galleryFragment = document.createDocumentFragment()

visiblePhotos.forEach(photo=>{

const cleanOriginalUrl = getPhotoOriginalUrl(photo)
if(!cleanOriginalUrl) return


const displayUrl = getDisplayImageUrl(photo, effectiveRole, guestFreeDownload)
let thumbnailUrl = getPhotoThumbnailUrl(photo)

if(!photo.thumbnail_key){
thumbnailUrl = getPhotoPreviewUrl(photo) || displayUrl
}

const div = document.createElement("div")

div.className =
"glass rounded-xl overflow-hidden cursor-pointer"

div.innerHTML = `
<img src="${thumbnailUrl}"
class="w-full h-40 object-cover hover:scale-105 transition"
loading="lazy"
decoding="async"
fetchpriority="low" />
`

const imageEl = div.querySelector("img")

if(effectiveRole === "guest"){
applyGuestImageProtection(imageEl)
}

imageEl.onerror = function(){
if(displayUrl && imageEl.src !== displayUrl){
imageEl.src = displayUrl
return
}
imageEl.onerror = null
}

div.onclick = () => openImage(photo)

galleryFragment.appendChild(div)

})

grid.appendChild(galleryFragment)

if(effectiveRole === "guest" && grid.children.length === 0){
empty.innerText = "No photos found for your face"
empty.classList.remove("hidden")
}

if(effectiveRole === "client" && FACE_FILTER_ACTIVE && grid.children.length === 0){
empty.innerText = "No face matched photos"
empty.classList.remove("hidden")
}

}

document.addEventListener("DOMContentLoaded",()=>{
loadGallery()
})
