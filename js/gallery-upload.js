const CLOUD_NAME = "YOUR_CLOUD_NAME";
const UPLOAD_PRESET = "studioos_gallery";

async function uploadImages() {

const files = document.getElementById("images").files;
const status = document.getElementById("status");

status.innerText = "Uploading...";

for (let file of files) {

let formData = new FormData();

formData.append("file", file);
formData.append("upload_preset", UPLOAD_PRESET);

let response = await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
{
method: "POST",
body: formData
}
);

let data = await response.json();

console.log("Uploaded:", data.secure_url);

}

status.innerText = "Upload complete";

}