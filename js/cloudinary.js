// =============================
// CLOUDINARY CONFIG
// =============================

// IMPORTANT: replace YOUR_CLOUD_NAME with your real cloudinary cloud name
const CLOUD_NAME = "dlu9ozif2"
const UPLOAD_PRESET = "studioos_upload"


// =============================
// UPLOAD FUNCTION
// =============================

async function uploadToCloudinary(file, eventId){

try{

const formData = new FormData()

formData.append("file", file)
formData.append("upload_preset", UPLOAD_PRESET)
formData.append("folder", "studioos/" + eventId)

const res = await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
{
method:"POST",
body:formData
}
)

const data = await res.json()

// check if upload success
if(!data || !data.secure_url){

console.error("Cloudinary upload failed:", data)
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