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
if(!select) return

const supabase = getSupabase()
const user = await getCurrentUser()

if(!user) return

const { data: events } = await supabase
.from("events")
.select("*")
.eq("user_id", user.id)
.order("created_at",{ascending:false})

select.innerHTML = `<option value="">Select Event</option>`

;(events || []).forEach(e=>{

const option = document.createElement("option")
option.value = String(e.id)

const name = e.client_name || e.event_name || "Event"
const date = e.event_date ? ` (${e.event_date})` : ""

option.textContent = `${name}${date}`

select.appendChild(option)

})

// CREATE OPTION
const createOption = document.createElement("option")
createOption.value = "create_new"
createOption.textContent = "+ Create New Event"
select.appendChild(createOption)


// ✅ RESTORED: AUTO SELECT FROM URL
const urlEvent = getEventFromURL()

if(urlEvent){
select.value = String(urlEvent)
}

}catch(err){
console.error(err)
}

}

document.addEventListener("DOMContentLoaded", loadConfirmedEvents)


// =============================
// UPLOAD IMAGES (FINAL FIX)
// =============================

async function uploadImages(finalEventId){

const input = document.getElementById("images")
const status = document.getElementById("status")
const progress = document.getElementById("progress")

if(!finalEventId){
status.innerText = "Invalid event"
return
}

const files = input.files

if(!files || !files.length){
status.innerText = "Please select images"
return
}

const user = await getCurrentUser()

if(!user){
status.innerText = "Login required"
return
}

status.innerText = "Uploading..."
progress.innerText = ""

let uploaded = 0

const validFiles =
[...files].filter(f=>f.type.startsWith("image/"))

const urls = []

for(const file of validFiles){

try{

const url = await window.uploadToCloudinary(file,finalEventId)

if(url){
uploaded++
progress.innerText = `${uploaded}/${validFiles.length}`
urls.push(url)
}

}catch(e){
console.error(e)
}

}

if(!urls.length){
status.innerText = "Upload failed"
return
}

const rows = urls.map(url=>({
event_id:finalEventId,
image_url:url,
user_id:user.id
}))

const success = await window.saveGalleryImages(rows)

if(!success){
status.innerText = "DB save failed"
return
}

status.innerText = "Upload Complete"
progress.innerText = "Done"

}

window.uploadImages = uploadImages