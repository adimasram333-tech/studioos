const CLOUD_NAME = "dlu9ozif2"
const UPLOAD_PRESET = "studioos_gallery"

async function uploadImages() {

const files = document.getElementById("images").files
const status = document.getElementById("status")

if (!files.length) {
status.innerText = "Please select images or folder"
return
}

status.innerText = "Preparing upload..."

let uploaded = 0

// event id create or get
let eventId = localStorage.getItem("current_event")

if(!eventId){
eventId = crypto.randomUUID()
localStorage.setItem("current_event",eventId)
}

const uploadFile = async (file) => {

try{

let formData = new FormData()

formData.append("file", file)
formData.append("upload_preset", UPLOAD_PRESET)
formData.append("folder","studioos/"+eventId)

const res = await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
{
method: "POST",
body: formData
})

const data = await res.json()

uploaded++

status.innerText = `Uploaded ${uploaded} / ${files.length}`

return data.secure_url

}catch(err){

console.error("Upload error:",err)

status.innerText = "Upload error occurred"

}

}

const uploads = []

for (let file of files) {

uploads.push(uploadFile(file))

}

// parallel upload
const uploadedUrls = await Promise.all(uploads)

console.log("Uploaded Images:",uploadedUrls)

status.innerText = "Upload Complete"

}