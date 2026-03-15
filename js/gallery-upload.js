const CLOUD_NAME = "dlu9ozif2"
const UPLOAD_PRESET = "studioos_gallery"

async function uploadImages() {

const files = document.getElementById("images").files
const status = document.getElementById("status")

if (!files.length) {
status.innerText = "Please select images or folder"
return
}

status.innerText = "Uploading..."

let uploaded = 0

const uploadFile = async (file) => {

let formData = new FormData()

formData.append("file", file)
formData.append("upload_preset", UPLOAD_PRESET)

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
}

const uploads = []

for (let file of files) {

uploads.push(uploadFile(file))

}

await Promise.all(uploads)

status.innerText = "Upload Complete"
}