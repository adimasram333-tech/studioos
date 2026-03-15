// ===============================
// CLOUDINARY CONFIG
// ===============================

// cloud name
const CLOUD_NAME = "dlu9ozif2"

// upload preset
const UPLOAD_PRESET = "studioos_gallery"

// upload endpoint
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dlu9ozif2/image/upload"



// ===============================
// UPLOAD FUNCTION
// ===============================

async function uploadToCloudinary(file,eventId){

const formData = new FormData()

formData.append("file",file)
formData.append("upload_preset",UPLOAD_PRESET)
formData.append("folder","studioos/"+eventId)

const res = await fetch(CLOUDINARY_URL,{
method:"POST",
body:formData
})

const data = await res.json()

return data.secure_url

}