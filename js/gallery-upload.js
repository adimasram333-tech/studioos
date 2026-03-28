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

// =============================
// 🔥 STEP 1: FETCH EVENTS TABLE
// =============================

const { data: events, error } = await supabase
.from("events")
.select("*")
.eq("user_id", user.id)
.order("created_at",{ascending:false})

if(error){
console.error("Events error", error)
}

// =============================
// 🔥 STEP 2: FETCH EVENTS FROM GALLERY (CRITICAL FIX)
// =============================

const { data: galleryEvents } = await supabase
.from("gallery_photos")
.select("event_id")
.eq("user_id", user.id)

// unique event ids
const galleryEventIds = [...new Set((galleryEvents || []).map(g=>g.event_id))]

// =============================
// 🔥 STEP 3: MERGE EVENTS
// =============================

const allEventsMap = new Map()

;(events || []).forEach(e=>{
if(e?.id){
allEventsMap.set(e.id,e)
}
})

// 👉 add missing gallery events
galleryEventIds.forEach(id=>{
if(!allEventsMap.has(id)){
allEventsMap.set(id,{
id:id,
client_name:"Gallery Event",
event_name:"Gallery Event",
event_date:""
})
}
})

// =============================
// RESET DROPDOWN
// =============================

select.innerHTML = `<option value="">Select Event</option>`

// =============================
// RENDER
// =============================

Array.from(allEventsMap.values()).forEach(e=>{

if(!e || !e.id) return

const option = document.createElement("option")
option.value = e.id

let displayName = e.client_name || e.event_name || "Event"

// clean name
if(displayName && displayName.startsWith("Q_")){
displayName = e.client_name || "Booking Event"
}

const dateText = e.event_date ? ` (${e.event_date})` : ""

option.textContent = `${displayName}${dateText}`

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
// CREATE MANUAL EVENT (SAFE)
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

// DUPLICATE CHECK
const { data: existing } = await supabase
.from("events")
.select("id")
.eq("user_id", user.id)
.eq("event_date", date)
.eq("client_name", name)

if(existing && existing.length > 0){
return existing[0].id
}

// CREATE
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
// UPLOAD IMAGES (FINAL SAFE)
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

const user = await getCurrentUser()

if(!user){
status.innerText = "Login required"
return
}

let eventId = getEventId()

if(eventId === "create_new" || !eventId){

eventId = await createManualEventIfNeeded()

if(!eventId){
status.innerText = "Please select or create event"
return
}

}

// 🔥 SAFETY: ensure UUID
if(!eventId || typeof eventId !== "string"){
status.innerText = "Invalid event selected"
return
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