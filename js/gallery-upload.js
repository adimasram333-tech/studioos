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
// GET EVENT FROM URL (SINGLE SOURCE)
// =============================

function getEventFromURL(){
const params = new URLSearchParams(window.location.search)
return params.get("event_id") || params.get("event")
}


// =============================
// LOAD EVENTS (UNCHANGED)
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

// ✅ ONLY EVENTS TABLE (NO MERGE)
const { data: events, error } = await supabase
.from("events")
.select("*")
.eq("user_id", user.id)
.order("created_at",{ascending:false})

if(error){
console.error("Events error", error)
}

// RESET
select.innerHTML = `<option value="">Select Event</option>`

// RENDER
;(events || []).forEach(e=>{

if(!e || !e.id) return

const option = document.createElement("option")

option.value = String(e.id)

const displayName = e.client_name || e.event_name || "Event"
const dateText = e.event_date ? ` (${e.event_date})` : ""

option.textContent = `${displayName}${dateText}`

select.appendChild(option)

})

// CREATE OPTION
const createOption = document.createElement("option")
createOption.value = "create_new"
createOption.textContent = "+ Create New Event"
select.appendChild(createOption)


// ✅ KEEP ORIGINAL AUTO SELECT
const urlEvent = getEventFromURL()

if(urlEvent){
select.value = String(urlEvent)
}

}catch(err){
console.error("Dropdown load error",err)
}

}


// =============================
// AUTO INIT
// =============================

document.addEventListener("DOMContentLoaded",()=>{
loadConfirmedEvents()
})


// =============================
// GET EVENT ID (UNCHANGED)
// =============================

function getEventId(){

const select = document.getElementById("eventSelect")

if(!select || !select.value){
return null
}

return String(select.value)

}


// =============================
// 🔥 UPLOAD IMAGES (FIXED WITHOUT REMOVAL)
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


// 🔥 FIX: USE PASSED EVENT FIRST
let eventId = finalEventId

// fallback (only if not provided)
if(!eventId){
eventId = getEventId()
}

if(!eventId){
eventId = getEventFromURL()
}

// ❌ prevent invalid value
if(eventId === "create_new"){
status.innerText = "Invalid event selection"
return
}

if(!eventId){
status.innerText = "Please select event"
return
}

eventId = String(eventId)


// SYSTEM CHECK
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

const uploadPromises = validFiles.map(async (file)=>{

try{

const url =
await window.uploadToCloudinary(file,eventId)

if(url){

uploaded++
progress.innerText = `${uploaded} / ${validFiles.length}`

return url

}

}catch(err){
console.error("Upload error",err)
}

return null

})

const urls =
(await Promise.all(uploadPromises)).filter(Boolean)

if(!urls.length){
status.innerText = "Upload failed"
return
}

try{

const rows = urls.map(url => ({
event_id:eventId,
image_url:url,
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

}catch(err){

console.error("Database save error",err)
status.innerText = "Upload complete but database save failed"

}

}

window.uploadImages = uploadImages