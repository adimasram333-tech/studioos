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
// 🔥 LOAD CONFIRMED + MANUAL EVENTS (FIXED)
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

// ===== FETCH DATA =====
const { data: quotations } = await supabase
.from("quotations")
.select("*")
.eq("status","confirmed")

const { data: events } = await supabase
.from("events")
.select("*")
.eq("user_id", user.id)

// RESET
select.innerHTML = `<option value="">Select Event</option>`

const added = new Set()

// quotations
quotations?.forEach(q => {

const key = q.client_name + "_" + q.event_date
if(added.has(key)) return
added.add(key)

const option = document.createElement("option")
option.value = q.id
option.textContent = `${q.client_name} (${q.event_date})`

select.appendChild(option)

})

// manual events
events?.forEach(e => {

const key = e.client_name + "_" + e.event_date
if(added.has(key)) return
added.add(key)

const option = document.createElement("option")
option.value = e.id
option.textContent = `${e.event_name} (${e.event_date})`

select.appendChild(option)

})

// 🔥 CREATE OPTION ADD
const createOption = document.createElement("option")
createOption.value = "create_new"
createOption.textContent = "+ Create New Event"
select.appendChild(createOption)

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
// 🔥 GET EVENT ID
// =============================

function getEventId(){

const select = document.getElementById("eventSelect")

if(!select || !select.value){
return null
}

return select.value

}



// =============================
// 🔥 CREATE MANUAL EVENT (FIXED)
// =============================

async function createManualEventIfNeeded(){

const select = document.getElementById("eventSelect")

if(select.value !== "create_new"){
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

// duplicate check
const { data: existing } = await supabase
.from("events")
.select("*")
.eq("client_name", name)
.eq("event_date", date)

if(existing && existing.length > 0){
return existing[0].id
}

const { data, error } = await supabase
.from("events")
.insert([{
user_id: user.id,
event_name: name,
client_name: name,
event_type: "manual",
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
// 🔥 EVENT LOGIC (SAFE FIX)
// =============================

let eventId = getEventId()

// manual create
if(eventId === "create_new" || !eventId){

eventId = await createManualEventIfNeeded()

if(!eventId){
status.innerText = "Please select or create event"
return
}

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