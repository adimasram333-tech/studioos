// =============================
// CLOUDINARY CONFIG
// =============================

const CLOUD_NAME = "dlu9ozif2"
const UPLOAD_PRESET = "studioos_gallery"
const CLOUDINARY_FOLDER = "studioos/websites"
const CLOUDINARY_DELETE_ENDPOINT = ""


// =============================
// RUNTIME CONFIG EXPOSURE
// =============================

export const CLOUDINARY_CONFIG = {
  cloudName: CLOUD_NAME,
  uploadPreset: UPLOAD_PRESET,
  folder: CLOUDINARY_FOLDER,
  deleteEndpoint: CLOUDINARY_DELETE_ENDPOINT
}

// Required for storage.js
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG

// Optional backward compatibility
window.CLOUDINARY_CLOUD_NAME = CLOUD_NAME
window.CLOUDINARY_UPLOAD_PRESET = UPLOAD_PRESET
window.CLOUDINARY_FOLDER = CLOUDINARY_FOLDER
window.CLOUDINARY_DELETE_ENDPOINT = CLOUDINARY_DELETE_ENDPOINT


// =============================
// IMAGE COMPRESSOR
// =============================

async function compressImage(file){
  return new Promise((resolve, reject) => {
    try{
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.src = e.target?.result || ""
      }

      reader.onerror = () => {
        reject(new Error("Unable to read selected image file."))
      }

      img.onload = () => {
        try{
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          if(!ctx){
            reject(new Error("Canvas not available"))
            return
          }

          let width = img.width
          let height = img.height

          const MAX_WIDTH = 1600

          if(width > MAX_WIDTH){
            height = height * (MAX_WIDTH / width)
            width = MAX_WIDTH
          }

          canvas.width = width
          canvas.height = height

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob((blob) => {
            if(!blob){
              reject(new Error("Compression failed"))
              return
            }
            resolve(blob)
          }, "image/jpeg", 0.7)
        }
        catch(error){
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error("Invalid image file"))
      }

      reader.readAsDataURL(file)
    }
    catch(error){
      reject(error)
    }
  })
}


// =============================
// UPLOAD FUNCTION
// =============================

async function uploadToCloudinary(file, folderOrEventId = ""){
  try{
    if(!CLOUD_NAME || !UPLOAD_PRESET){
      console.error("Cloudinary config missing")
      return null
    }

    const compressedFile = await compressImage(file)

    const formData = new FormData()
    formData.append("file", compressedFile)
    formData.append("upload_preset", UPLOAD_PRESET)

    const folder = folderOrEventId
      ? `${CLOUDINARY_FOLDER}/${folderOrEventId}`
      : CLOUDINARY_FOLDER

    formData.append("folder", folder)

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

    const res = await fetch(url, {
      method: "POST",
      body: formData
    })

    const data = await res.json()

    console.log("Cloudinary response:", data)

    if(!res.ok || !data?.secure_url){
      console.error("Upload failed:", data)
      return null
    }

    return data.secure_url
  }
  catch(err){
    console.error("Upload error:", err)
    return null
  }
}


// =============================
// GLOBAL EXPORT
// =============================

window.uploadToCloudinary = uploadToCloudinary