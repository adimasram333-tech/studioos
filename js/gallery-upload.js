// =============================
// SAFE SUPABASE ACCESS
// =============================

function getSupabase(){

if(window.getSupabase && window.getSupabase !== getSupabase){
return window.getSupabase()
}

if(window.supabaseClient){
return window.supabaseClient
}

throw new Error("Supabase client not initialized")

}

async function getCurrentUser(){

if(window.getCurrentUser && window.getCurrentUser !== getCurrentUser){
return await window.getCurrentUser()
}

const supabase = getSupabase()

try{

const { data, error } = await supabase.auth.getUser()

if(error){
console.error("Auth error", error)
return null
}

return data?.user || null

}catch(err){
console.error("Auth crash", err)
return null

}

}


// =============================
// 🔥 NEW FACE FUNCTION (PERMANENT SAFE FIX)
// =============================

async function processFace(imageUrl, eventId, userId){

try{

if(!imageUrl || !eventId){
return {
saved: false,
facesDetected: 0,
reason: "missing_image_or_event"
}
}

const cleanUrl = String(imageUrl).split("?")[0].trim()

const loadModelsFn =
window.loadFaceModels ||
(window.faceEngine && window.faceEngine.loadFaceModels)

const processMultiFaceFn =
window.processImageForFaces ||
(window.faceEngine && window.faceEngine.processImageForFaces)

const getEncodingFn =
window.getFaceEncoding ||
(window.faceEngine && window.faceEngine.getFaceEncoding)

if(loadModelsFn){
await loadModelsFn()
}

if(!processMultiFaceFn && !getEncodingFn){
console.warn("face.js not loaded")
return {
saved: false,
facesDetected: 0,
reason: "face_engine_missing"
}
}

const supabase = getSupabase()

let encodings = []

if(processMultiFaceFn){
const multiResult = await processMultiFaceFn(cleanUrl)

if(Array.isArray(multiResult) && multiResult.length > 0){
encodings = multiResult.filter(arr =>
Array.isArray(arr) && arr.length > 0
)
}
}

if((!encodings || encodings.length === 0) && getEncodingFn){
const singleEncoding = await getEncodingFn(cleanUrl)

if(singleEncoding && Array.isArray(singleEncoding) && singleEncoding.length > 0){
encodings = [singleEncoding]
}
}

if(!encodings || encodings.length === 0){
console.warn("No valid face detected:", cleanUrl)
return {
saved: false,
facesDetected: 0,
reason: "no_face_detected"
}
}

const { data: existingFaces, error: existingError } = await supabase
.from("face_data")
.select("id, face_encoding")
.eq("event_id", String(eventId))
.eq("image_url", cleanUrl)
.limit(100)

if(existingError){
console.error("Existing face fetch error:", existingError)
return {
saved: false,
facesDetected: 0,
reason: "existing_face_fetch_failed"
}
}

function getFaceDistance(a, b){
if(!Array.isArray(a) || !Array.isArray(b)) return Number.POSITIVE_INFINITY
if(a.length !== b.length) return Number.POSITIVE_INFINITY

let dist = 0

for(let i=0;i<a.length;i++){
const diff = Number(a[i]) - Number(b[i])
dist += diff * diff
}

return Math.sqrt(dist)
}

const duplicateThreshold = 0.01
const knownEncodings = []

;(existingFaces || []).forEach(row=>{
if(row && Array.isArray(row.face_encoding) && row.face_encoding.length > 0){
knownEncodings.push(row.face_encoding)
}
})

const uniqueEncodingsToInsert = []

encodings.forEach(encoding=>{

if(!Array.isArray(encoding) || encoding.length === 0){
return
}

let duplicateFound = false

for(const known of knownEncodings){
if(getFaceDistance(known, encoding) < duplicateThreshold){
duplicateFound = true
break
}
}

if(duplicateFound){
return
}

uniqueEncodingsToInsert.push(encoding)
knownEncodings.push(encoding)

})

if(uniqueEncodingsToInsert.length === 0){
console.log("Face data already exists:", cleanUrl)
return {
saved: true,
facesDetected: existingFaces?.length || 0,
reason: "already_exists"
}
}

const rows = uniqueEncodingsToInsert.map(encoding => ({
event_id: String(eventId),
image_url: cleanUrl,
face_encoding: encoding,
user_id: userId
}))

const { error } = await supabase
.from("face_data")
.insert(rows)

if(error){
console.error("Face save error:", error)
return {
saved: false,
facesDetected: 0,
reason: "db_insert_failed"
}
}else{
console.log(`Face saved (${rows.length} face${rows.length > 1 ? "s" : ""}):`, cleanUrl)
return {
saved: true,
facesDetected: rows.length,
reason: "saved"
}
}

}catch(err){
console.error("Face processing failed:", err)
return {
saved: false,
facesDetected: 0,
reason: "processing_failed"
}
}

}


// =============================
// 🔥 AUTO FIX OLD BOOKINGS (SAFE ONE-TIME)
// =============================

async function autoFixOldBookings(){

try{

const supabase = getSupabase()
const user = await getCurrentUser()

if(!user) return

const { data: quotations } = await supabase
.from("quotations")
.select("*")
.eq("user_id", user.id)
.eq("status", "confirmed")

if(!quotations) return

for(const q of quotations){

const eventName = "Q_" + q.id

const { data: existing } = await supabase
.from("events")
.select("id")
.eq("event_name", eventName)

if(existing && existing.length > 0){
continue
}

const { data: eventData, error } = await supabase
.from("events")
.insert([{
user_id: user.id,
client_name: q.client_name,
event_name: eventName,
event_type: q.event_category || "event",
event_date: q.event_date,
status: "active"
}])
.select()
.single()

if(error){
console.error("AUTO EVENT ERROR", error)
continue
}

const token =
Math.random().toString(36).substring(2,10).toUpperCase()

await supabase
.from("event_tokens")
.insert([{
event_id: eventData.id,
token: token,
used: false
}])

}

console.log("Old bookings auto-fixed ✅")

}catch(err){
console.error("Auto fix error", err)
}

}


// =============================
// GET EVENT FROM URL
// =============================

function getEventFromURL(){
const params = new URLSearchParams(window.location.search)
return params.get("event_id") || params.get("event")
}


// =============================
// LOAD EVENTS
// =============================

async function loadConfirmedEvents(selectedEventId = null){

try{

const select = document.getElementById("eventSelect")

if(!select){
return
}

const supabase = getSupabase()
const user = await getCurrentUser()

if(!user){
return
}

if(!localStorage.getItem("oldBookingsFixed")){
await autoFixOldBookings()
localStorage.setItem("oldBookingsFixed","true")
}

const { data: events, error } = await supabase
.from("events")
.select("*")
.eq("user_id", user.id)

if(error){
console.error("Events error", error)
}

const safeEvents = (events || []).filter(e => e && e.id)

safeEvents.sort((a, b) => {
const aEventDate = a?.event_date ? new Date(a.event_date).getTime() : 0
const bEventDate = b?.event_date ? new Date(b.event_date).getTime() : 0

if(bEventDate !== aEventDate){
return bEventDate - aEventDate
}

const aCreatedAt = a?.created_at ? new Date(a.created_at).getTime() : 0
const bCreatedAt = b?.created_at ? new Date(b.created_at).getTime() : 0

return bCreatedAt - aCreatedAt
})

select.innerHTML = `
<option value="">Select Event</option>
<option value="create_new">+ Create New Event</option>
`

safeEvents.forEach(e => {

const option = document.createElement("option")

option.value = String(e.id)

const displayName = e.client_name || e.event_name || "Event"
const dateText = e.event_date ? ` (${e.event_date})` : ""

option.textContent = `${displayName}${dateText}`

select.appendChild(option)

})

const createEventBox = document.getElementById("createEventBox")

if(selectedEventId){
select.value = String(selectedEventId)
if(createEventBox){
createEventBox.style.display = "none"
}
}else{
const urlEvent = getEventFromURL()
if(urlEvent){
select.value = String(urlEvent)
if(createEventBox){
createEventBox.style.display = "none"
}
}
}

}catch(err){
console.error("Dropdown load error",err)
}

}

window.loadConfirmedEvents = loadConfirmedEvents


// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded",()=>{
loadConfirmedEvents()
})


// =============================
// बाकी code unchanged
// =============================

function getEventId(){
const select = document.getElementById("eventSelect")
if(!select || !select.value){
return null
}
return String(select.value)
}


// =============================
// 🔥 UPLOAD SYSTEM (SAFE FIX)
// =============================

async function uploadImages(finalEventId){

const input = document.getElementById("images")
const status = document.getElementById("status")
const progress = document.getElementById("progress")

if(!input){
console.error("Image input missing")
return
}

const files = input.files

if(!files || !files.length){
status.innerText = "Please select images or folder"
return
}

const user = await getCurrentUser()

if(!user){
status.innerText = "Login required"
return
}

let eventId = finalEventId

if(!eventId){
eventId = getEventId()
}

if(!eventId){
eventId = getEventFromURL()
}

if(eventId === "create_new"){
status.innerText = "Invalid event selection"
return
}

if(!eventId){
status.innerText = "Please select event"
return
}

eventId = String(eventId)

if(typeof window.uploadToCloudinary !== "function"){
status.innerText = "Upload system not loaded"
return
}

if(typeof window.saveGalleryImages !== "function"){
status.innerText = "Database system not loaded"
return
}

status.innerText = "Uploading photos..."
progress.innerText = ""

let uploaded = 0
let savedFacesImages = 0
let totalFacesDetected = 0
let skippedFaceImages = 0

const skippedFiles = []

const validFiles =
[...files].filter(file => file && file.type && file.type.startsWith("image/"))

if(validFiles.length === 0){
status.innerText = "No valid images selected"
return
}

const urls = []

for(const file of validFiles){

try{

const url = await window.uploadToCloudinary(file, eventId)

if(url){

uploaded++
progress.innerText = `${uploaded} / ${validFiles.length}`

urls.push(url)

const faceResult = await processFace(url, eventId, user.id)

if(faceResult && faceResult.saved){
if(faceResult.reason !== "already_exists"){
savedFacesImages++
}
if(faceResult.facesDetected > 0){
totalFacesDetected += faceResult.facesDetected
}
}else{
skippedFaceImages++
skippedFiles.push({
name: file.name,
reason: faceResult?.reason || "unknown"
})
}

}

}catch(err){
console.error("Upload error",err)
skippedFaceImages++
skippedFiles.push({
name: file.name,
reason: "upload_failed"
})
}

}

if(!urls.length){
status.innerText = "Upload failed"
return
}

try{

const rows = urls.map(url => ({
event_id:eventId,
image_url:String(url).split("?")[0].trim(),
user_id:user.id
}))

const success =
await window.saveGalleryImages(rows)

if(!success){
status.innerText = "Upload complete but database save failed"
return
}

status.innerText = "Upload Complete"
progress.innerText =
`${urls.length} photos uploaded • ${savedFacesImages} photos processed for face • ${totalFacesDetected} faces detected • ${skippedFaceImages} skipped`

if(skippedFiles.length > 0){
console.warn("Skipped face processing files:", skippedFiles)
}

await loadConfirmedEvents(eventId)

}catch(err){

console.error("Database save error",err)
status.innerText = "Upload complete but database save failed"

}

}

window.uploadImages = uploadImages