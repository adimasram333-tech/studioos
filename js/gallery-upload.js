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
// 🔥 LOAD EVENTS (FINAL FIX)
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

// ===== FETCH ONLY EVENTS TABLE =====
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

;(events || []).forEach(e => {

if(!e || !e.id) return

const option = document.createElement("option")

// ✅ ALWAYS USE EVENTS.ID
option.value = e.id

option.textContent = `${e.client_name || e.event_name} (${e.event_date})`

select.appendChild(option)

})

// CREATE OPTION
const createOption = document.createElement("option")
createOption.value = "create_new"
createOption.textContent = "+ Create New Event"
select.appendChild(createOption)

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
// GET EVENT ID
// =============================

function getEventId(){

const select = document.getElementById("eventSelect")

if(!select || !select.value){
return null
}

return select.value

}


// =============================
// CREATE MANUAL EVENT (FIXED)
// =============================

async function createManualEventIfNeeded(){

const select = document.getElementById("eventSelect")

if(!select || select.value !== "create_new"){
return null
}

const name = document.getElementById("manualEventName")?.value?.trim()
const date = document.getElementById("manualEventDate")?.value

if(!name || !date){
alert("Enter event name and date")
return null
}

const supabase = getSupabase()
const user = await getCurrentUser()

if(!user) return null

// 🔥 CREATE DIRECTLY IN EVENTS TABLE
const { data, error } = await supabase
.from("events")
.insert([{
user_id: user.id,
client_name: name,
event_name: name,
event_date: date,
status: "active"
}])
.select()
.single()

if(error){
console.error(error)
alert("Event create failed")
return null
}

// refresh dropdown
await loadConfirmedEvents()

return data.id

}


// =============================
// UPLOAD IMAGES (FIXED)
// =============================

async function uploadImages(){

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

// USER CHECK
const user = await getCurrentUser()

if(!user){
status.innerText = "Login required"
return
}

// EVENT
let eventId = getEventId()

// CREATE IF NEEDED
if(eventId === "create_new" || !eventId){

eventId = await createManualEventIfNeeded()

if(!eventId){
status.innerText = "Please select or create event"
return
}

}

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
let urls = []

// FILTER IMAGES
const validFiles =
[...files].filter(file => file && file.type && file.type.startsWith("image/"))

if(validFiles.length === 0){
status.innerText = "No valid images selected"
return
}

// UPLOAD
const uploadPromises = validFiles.map(async (file)=>{

try{

const url =
await window.uploadToCloudinary(file,eventId)

if(url){

uploaded++

progress.innerText =
`${uploaded} / ${validFiles.length}`

return url

}

}catch(err){
console.error("Upload error",err)
}

return null

})

urls =
(await Promise.all(uploadPromises))
.filter(Boolean)

if(!urls.length){
status.innerText = "Upload failed"
return
}

// SAVE
try{

const rows = urls.map(url => ({
event_id:eventId, // ✅ FINAL FIX
image_url:url,
user_id:user.id
}))

const success =
await window.saveGalleryImages(rows)

if(!success){

status.innerText =
"Upload complete but database save failed"

return

}

status.innerText = "Upload Complete"
progress.innerText = "All photos uploaded"

}catch(err){

console.error("Database save error",err)

status.innerText =
"Upload complete but database save failed"

}

}

// EXPORT
window.uploadImages = uploadImages