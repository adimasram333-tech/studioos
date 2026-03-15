// =============================
// GET EVENT ID
// =============================

function getEventId(){

let eventId = localStorage.getItem("current_event")

if(!eventId){

eventId = "event_" + Date.now()
localStorage.setItem("current_event",eventId)

}

return eventId

}



// =============================
// UPLOAD IMAGES
// =============================

async function uploadImages(){

const input = document.getElementById("images")
const status = document.getElementById("status")
const progress = document.getElementById("progress")

const files = input.files

if(!files.length){

status.innerText = "Please select images or folder"
return

}

status.innerText = "Uploading photos..."
progress.innerText = ""

const eventId = getEventId()

let uploaded = 0
let urls = []



for(const file of files){

try{

// upload using cloudinary.js function
const url = await uploadToCloudinary(file,eventId)

if(url){

urls.push(url)

uploaded++

progress.innerText = `${uploaded} / ${files.length}`

}

}catch(err){

console.error("Upload error",err)
status.innerText = "Upload error occurred"

}

}



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
image_url:url
}))

await saveGalleryImages(rows)

status.innerText = "Upload Complete"
progress.innerText = "All photos uploaded"

console.log("Uploaded URLs",urls)

}catch(err){

console.error("Database save error",err)
status.innerText = "Upload complete but database save failed"

}

}