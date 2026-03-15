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
// UPLOAD IMAGES (FAST PARALLEL)
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

// safety check
if(typeof uploadToCloudinary !== "function"){

console.error("Cloudinary uploader missing")
status.innerText = "Upload system not loaded"
return

}

if(typeof saveGalleryImages !== "function"){

console.error("Supabase save function missing")
status.innerText = "Database system not loaded"
return

}

status.innerText = "Uploading photos..."
progress.innerText = ""

const eventId = getEventId()

let uploaded = 0
let urls = []



const uploadPromises = [...files].map(async (file)=>{

try{

const url = await uploadToCloudinary(file,eventId)

if(url){

uploaded++

progress.innerText = `${uploaded} / ${files.length}`

return url

}

}catch(err){

console.error("Upload error",err)

}

})



urls = (await Promise.all(uploadPromises)).filter(Boolean)



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