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

if(!imageUrl || !eventId) return

// ✅ URL normalize (VERY IMPORTANT)
const cleanUrl = String(imageUrl).split("?")[0].trim()

// ✅ SUPPORT BOTH GLOBAL + faceEngine
const loadModelsFn =
window.loadFaceModels ||
(window.faceEngine && window.faceEngine.loadFaceModels)

const processMultiFaceFn =
window.processImageForFaces ||
(window.faceEngine && window.faceEngine.processImageForFaces)

const getEncodingFn =
window.getFaceEncoding ||
(window.faceEngine && window.faceEngine.getFaceEncoding)

// ✅ MODEL LOAD
if(loadModelsFn){
await loadModelsFn()
}

if(!processMultiFaceFn && !getEncodingFn){
console.warn("face.js not loaded")
return
}

const supabase = getSupabase()

// ✅ IMAGE-LEVEL DUPLICATE CHECK
// same image already processed => skip full insert
const { data: existing } = await supabase
.from("face_data")
.select("id")
.eq("event_id", String(eventId))
.eq("image_url", cleanUrl)
.limit(1)

if(existing && existing.length > 0){
console.log("Face data already exists:", cleanUrl)
return
}

// ✅ MULTI-FACE FIRST (wedding/group safe)
let encodings = []

if(processMultiFaceFn){
const multiResult = await processMultiFaceFn(cleanUrl)

if(Array.isArray(multiResult) && multiResult.length > 0){
encodings = multiResult.filter(arr =>
Array.isArray(arr) && arr.length > 0
)
}
}

// ✅ FALLBACK SINGLE FACE
if((!encodings || encodings.length === 0) && getEncodingFn){
const singleEncoding = await getEncodingFn(cleanUrl)

if(singleEncoding && Array.isArray(singleEncoding) && singleEncoding.length > 0){
encodings = [singleEncoding]
}
}

// ❌ invalid encoding(s)
if(!encodings || encodings.length === 0){
console.warn("No valid face detected:", cleanUrl)
return
}

// ✅ PREPARE MULTI INSERT
const rows = encodings.map(encoding => ({
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
}else{
console.log(`Face saved (${rows.length} face${rows.length > 1 ? "s" : ""}):`, cleanUrl)
}

}catch(err){
console.error("Face processing failed:", err)
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

async function loadConfirmedEvents(){

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
.order("created_at",{ascending:false})

if(error){
console.error("Events error", error)
}

select.innerHTML = `<option value="">Select Event</option>`

;(events || []).forEach(e=>{

if(!e || !e.id) return

if(user && e.user_id && e.user_id !== user.id){
return
}

const option = document.createElement("option")

option.value = String(e.id)

const displayName = e.client_name || e.event_name || "Event"
const dateText = e.event_date ? ` (${e.event_date})` : ""

option.textContent = `${displayName}${dateText}`

select.appendChild(option)

})

const createOption = document.createElement("option")
createOption.value = "create_new"
createOption.textContent = "+ Create New Event"
select.appendChild(createOption)

const urlEvent = getEventFromURL()

if(urlEvent){
select.value = String(urlEvent)
}

}catch(err){
console.error("Dropdown load error",err)
}

}


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

const validFiles =
[...files].filter(file => file && file.type && file.type.startsWith("image/"))

if(validFiles.length === 0){
status.innerText = "No valid images selected"
return
}

// 🔥 SEQUENTIAL UPLOAD (SAFE)
const urls = []

for(const file of validFiles){

try{

const url = await window.uploadToCloudinary(file, eventId)

if(url){

uploaded++
progress.innerText = `${uploaded} / ${validFiles.length}`

urls.push(url)

// 🔥 FACE PROCESS SAFE (WAIT)
await processFace(url, eventId, user.id)

}

}catch(err){
console.error("Upload error",err)
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
progress.innerText = "All photos uploaded"

await loadConfirmedEvents()

}catch(err){

console.error("Database save error",err)
status.innerText = "Upload complete but database save failed"

}

}

window.uploadImages = uploadImages