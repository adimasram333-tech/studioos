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

const { data:{ user } } =
await supabase.auth.getUser()

return user

}


// =============================
// 🔥 LOAD CONFIRMED + MANUAL EVENTS (UPDATED)
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

// ===== CONFIRMED QUOTATIONS =====
const { data: quotations } = await supabase
.from("quotations")
.select("*")
.eq("status","confirmed")

// ===== MANUAL EVENTS =====
const { data: events } = await supabase
.from("events")
.select("*")
.eq("user_id", user.id)

select.innerHTML = `<option value="">Select Event</option>`

// quotations
quotations?.forEach(q => {

const option = document.createElement("option")

option.value = "q_" + q.id

option.textContent =
`${q.client_name} (${q.event_date})`

select.appendChild(option)

})

// manual events
events?.forEach(e => {

const option = document.createElement("option")

option.value = "e_" + e.id

option.textContent =
`${e.event_name} (${e.event_date})`

select.appendChild(option)

})

}catch(err){
console.error("Dropdown load error",err)
}

}


// =============================
// 🔥 AUTO INIT
// =============================

document.addEventListener("DOMContentLoaded",()=>{

loadConfirmedEvents()

})



// =============================
// 🔥 GET EVENT ID (UPDATED HYBRID)
// =============================

function getEventId(){

const select = document.getElementById("eventSelect")

if(!select || !select.value){
return null
}

return select.value

}



// =============================
// 🔥 CREATE MANUAL EVENT (NEW)
// =============================

async function createManualEventIfNeeded(){

const input = document.getElementById("newEventInput")

if(!input || !input.value.trim()){
return null
}

const eventName = input.value.trim()

const supabase = getSupabase()
const user = await getCurrentUser()

// ⚠️ IMPORTANT: date required
const eventDate = prompt("Enter event date (YYYY-MM-DD)")

if(!eventDate){
alert("Event date required")
return null
}

const { data, error } = await supabase
.from("events")
.insert([{
user_id: user.id,
event_name: eventName,
client_name: eventName,
event_type: "manual",
event_date: eventDate,
status: "active"
}])
.select()

if(error){
console.error(error)
alert("Event create failed")
return null
}

// reload dropdown
await loadConfirmedEvents()

return "e_" + data[0].id

}



// =============================
// UPLOAD IMAGES (FAST PARALLEL)
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

if(!files.length){

status.innerText = "Please select images or folder"
return

}


// =============================
// USER CHECK
// =============================

const user = await getCurrentUser()

if(!user){

status.innerText = "Login required"
console.error("User not authenticated")
return

}


// =============================
// 🔥 EVENT LOGIC (UPDATED)
// =============================

let eventId = getEventId()

// manual create
if(!eventId){

eventId = await createManualEventIfNeeded()

if(!eventId){
status.innerText = "Please select or create event"
return
}

}

// clean ID (remove prefix)
if(eventId.startsWith("q_")){
eventId = eventId.replace("q_","")
}
if(eventId.startsWith("e_")){
eventId = eventId.replace("e_","")
}


// =============================
// SYSTEM CHECKS
// =============================

if(typeof window.uploadToCloudinary !== "function"){

console.error("Cloudinary uploader missing")
status.innerText = "Upload system not loaded"
return

}

if(typeof window.saveGalleryImages !== "function"){

console.error("Supabase save function missing")
status.innerText = "Database system not loaded"
return

}


status.innerText = "Uploading photos..."
progress.innerText = ""

let uploaded = 0
let urls = []


// =============================
// FILTER VALID IMAGES
// =============================

const validFiles =
[...files].filter(file => file.type.startsWith("image/"))

if(validFiles.length === 0){

status.innerText = "No valid images selected"
return

}



// =============================
// PARALLEL UPLOAD
// =============================

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

})


urls =
(await Promise.all(uploadPromises))
.filter(Boolean)



if(!urls.length){

status.innerText = "Upload failed"
return

}



// =============================
// SAVE TO DATABASE
// =============================

try{

const rows = urls.map(url => ({
event_id:eventId,
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

console.log("Uploaded URLs",urls)

}catch(err){

console.error("Database save error",err)

status.innerText =
"Upload complete but database save failed"

}

}



// =============================
// GLOBAL EXPORT
// =============================

window.uploadImages = uploadImages