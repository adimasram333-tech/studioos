// =============================
// CLOUDINARY CONFIG
// =============================

const CLOUD_NAME = "YOUR_CLOUD_NAME"
const UPLOAD_PRESET = "studioos_upload"


// =============================
// UPLOAD FUNCTION
// =============================

async function uploadToCloudinary(file, eventId){

const formData = new FormData()

formData.append("file",file)
formData.append("upload_preset",UPLOAD_PRESET)
formData.append("folder","studioos/"+eventId)


const res = await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
{
method:"POST",
body:formData
}
)

const data = await res.json()

return data.secure_url

}