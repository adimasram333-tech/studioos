const CLOUDINARY_IMPORT_PATH = "./cloudinary.js"

let cachedConfig = null

function pickNonEmpty(value){
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function buildConfigFromObject(obj){
  if(!obj || typeof obj !== "object") return null

  const cloudName =
    pickNonEmpty(obj.cloudName) ||
    pickNonEmpty(obj.CLOUDINARY_CLOUD_NAME)

  const uploadPreset =
    pickNonEmpty(obj.uploadPreset) ||
    pickNonEmpty(obj.CLOUDINARY_UPLOAD_PRESET)

  const folder =
    pickNonEmpty(obj.folder) ||
    pickNonEmpty(obj.CLOUDINARY_FOLDER) ||
    "studioos/websites"

  const deleteEndpoint =
    pickNonEmpty(obj.deleteEndpoint) ||
    pickNonEmpty(obj.CLOUDINARY_DELETE_ENDPOINT)

  if(!cloudName || !uploadPreset) return null

  return {
    cloudName,
    uploadPreset,
    folder,
    deleteEndpoint
  }
}

async function getCloudinaryConfig(){
  if(cachedConfig) return cachedConfig

  const windowCandidates = [
    window.__CLOUDINARY_CONFIG__,
    window.CLOUDINARY_CONFIG,
    {
      cloudName: window.CLOUDINARY_CLOUD_NAME,
      uploadPreset: window.CLOUDINARY_UPLOAD_PRESET,
      folder: window.CLOUDINARY_FOLDER,
      deleteEndpoint: window.CLOUDINARY_DELETE_ENDPOINT
    }
  ]

  for(const candidate of windowCandidates){
    const config = buildConfigFromObject(candidate)
    if(config){
      cachedConfig = config
      return cachedConfig
    }
  }

  try{
    const mod = await import(CLOUDINARY_IMPORT_PATH)

    const moduleCandidates = [
      mod.default,
      mod.CLOUDINARY_CONFIG,
      {
        cloudName: mod.CLOUDINARY_CLOUD_NAME || mod.cloudName,
        uploadPreset: mod.CLOUDINARY_UPLOAD_PRESET || mod.uploadPreset,
        folder: mod.CLOUDINARY_FOLDER || mod.folder,
        deleteEndpoint: mod.CLOUDINARY_DELETE_ENDPOINT || mod.deleteEndpoint
      }
    ]

    for(const candidate of moduleCandidates){
      const config = buildConfigFromObject(candidate)
      if(config){
        cachedConfig = config
        return cachedConfig
      }
    }
  }
  catch(error){
    console.warn("Cloudinary config import skipped:", error)
  }

  throw new Error(
    "Cloudinary config not found. Expose cloudName + uploadPreset from js/cloudinary.js or window.CLOUDINARY_CONFIG."
  )
}

function validateImageFile(file){
  if(!file) throw new Error("No image file selected.")
  if(!String(file.type || "").startsWith("image/")){
    throw new Error("Selected file is not an image.")
  }
}

function extractPublicIdFromUrl(url){
  const value = String(url || "").trim()
  if(!value) return ""

  const uploadMarker = "/upload/"
  const uploadIndex = value.indexOf(uploadMarker)
  if(uploadIndex === -1) return ""

  let remainder = value.slice(uploadIndex + uploadMarker.length)
  remainder = remainder.replace(/^v\d+\//, "")
  remainder = remainder.split("?")[0]

  const lastDot = remainder.lastIndexOf(".")
  if(lastDot !== -1){
    remainder = remainder.slice(0, lastDot)
  }

  return remainder
}

export async function uploadImage(file, options = {}){
  validateImageFile(file)

  const config = await getCloudinaryConfig()

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", config.uploadPreset)
  formData.append("folder", options.folder || config.folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  )

  const result = await response.json()

  if(!response.ok){
    throw new Error(result?.error?.message || "Cloudinary upload failed.")
  }

  return {
    url: result.secure_url,
    publicId: result.public_id
  }
}

export async function deleteImageByUrl(url){
  const config = await getCloudinaryConfig()
  const publicId = extractPublicIdFromUrl(url)

  if(!publicId){
    return { skipped: true, reason: "No public id found." }
  }

  if(!config.deleteEndpoint){
    return {
      skipped: true,
      reason: "Delete endpoint not configured."
    }
  }

  const response = await fetch(config.deleteEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ publicId })
  })

  let result = {}
  try{
    result = await response.json()
  }
  catch(error){
    result = {}
  }

  if(!response.ok){
    throw new Error(result?.error || "Cloudinary delete failed.")
  }

  return result
}

export async function replaceImageAsset({ oldUrl = "", file, folder = "" }){
  const uploaded = await uploadImage(file, { folder })

  let deleteResult = { skipped: true, reason: "No previous file." }

  if(oldUrl && oldUrl !== uploaded.url){
    try{
      deleteResult = await deleteImageByUrl(oldUrl)
    }
    catch(error){
      console.warn("Old Cloudinary file cleanup skipped:", error)
      deleteResult = {
        skipped: true,
        reason: error.message || "Delete skipped"
      }
    }
  }

  return {
    newUrl: uploaded.url,
    oldUrl,
    deleteResult
  }
}


// =============================
// 🔥 NEW: TEMPLATE IMAGE SLOT SYSTEM
// =============================

export async function replaceTemplateImage({
  supabase,
  userId,
  websiteId,
  slot,
  file,
  currentData = {}
}){
  if(!slot) throw new Error("Image slot is required.")

  const existingImages = currentData.template_images || {}
  const oldUrl = existingImages[slot] || ""

  const { newUrl, deleteResult } = await replaceImageAsset({
    oldUrl,
    file,
    folder: `websites/${userId}`
  })

  const updatedImages = {
    ...existingImages,
    [slot]: newUrl
  }

  const { error } = await supabase
    .from("user_websites")
    .update({
      template_images: updatedImages
    })
    .eq("id", websiteId)
    .eq("user_id", userId)

  if(error){
    throw new Error("Failed to update template images.")
  }

  return {
    slot,
    newUrl,
    deleteResult
  }
}