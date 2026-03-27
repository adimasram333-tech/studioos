// =============================
// CLOUDINARY CONFIG
// =============================

// IMPORTANT: replace with your real cloudinary details
const CLOUD_NAME = "dlu9ozif2"
const UPLOAD_PRESET = "studioos_gallery" // 🔥 FIXED


// =============================
// UPLOAD FUNCTION
// =============================

async function uploadToCloudinary(file, eventId){

try{

if(!CLOUD_NAME || !UPLOAD_PRESET){
console.error("Cloudinary config missing")
return null
}

const formData = new FormData()

formData.append("file", file)
formData.append("upload_preset", UPLOAD_PRESET)
formData.append("folder", "studioos/" + eventId)

const url =
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

const res = await fetch(url,{
method:"POST",
body:formData
})

const data = await res.json()

// DEBUG LOG
console.log("Cloudinary response:", data)

// check if upload success
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
// GLOBAL EXPORT (IMPORTANT)
// =============================

window.uploadToCloudinary = uploadToCloudinary