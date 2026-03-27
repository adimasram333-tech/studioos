// =============================
// CLOUDINARY CONFIG
// =============================

const CLOUD_NAME = "dlu9ozif2"
const UPLOAD_PRESET = "studioos_gallery"


// =============================
// IMAGE COMPRESSOR (NEW)
// =============================

async function compressImage(file){

return new Promise((resolve)=>{

const img = new Image()
const reader = new FileReader()

reader.onload = (e)=>{
img.src = e.target.result
}

img.onload = ()=>{

const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")

let width = img.width
let height = img.height

// 🔥 resize large images
const MAX_WIDTH = 1600

if(width > MAX_WIDTH){
height = height * (MAX_WIDTH / width)
width = MAX_WIDTH
}

canvas.width = width
canvas.height = height

ctx.drawImage(img, 0, 0, width, height)

// 🔥 compress quality
canvas.toBlob((blob)=>{
resolve(blob)
}, "image/jpeg", 0.7)

}

reader.readAsDataURL(file)

})

}


// =============================
// UPLOAD FUNCTION
// =============================

async function uploadToCloudinary(file, eventId){

try{

if(!CLOUD_NAME || !UPLOAD_PRESET){
console.error("Cloudinary config missing")
return null
}

// 🔥 COMPRESS IMAGE BEFORE UPLOAD
const compressedFile = await compressImage(file)

const formData = new FormData()

formData.append("file", compressedFile)
formData.append("upload_preset", UPLOAD_PRESET)
formData.append("folder", "studioos/" + eventId)

const url =
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

const res = await fetch(url,{
method:"POST",
body:formData
})

const data = await res.json()

console.log("Cloudinary response:", data)

if(!data || !data.secure_url){

console.error("Cloudinary upload failed:", data)

if(data?.error){
console.error("Cloudinary error message:", data.error.message)
}

return null

}

return data.secure_url

}catch(err){

console.error("Cloudinary upload error:", err)
return null

}

}


// =============================
// GLOBAL EXPORT
// =============================

window.uploadToCloudinary = uploadToCloudinary