const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dlu9ozif2/image/upload"

const UPLOAD_PRESET = "studioos_gallery"

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