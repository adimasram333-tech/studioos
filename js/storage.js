let cachedCdnBase = null

function pickNonEmpty(value){
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function getCdnBaseUrl(){
  if(cachedCdnBase) return cachedCdnBase

  const candidates = [
    window.MEDIA_CDN_BASE_URL,
    window.__MEDIA_CDN_BASE_URL__,
    window.CDN_BASE_URL
  ]

  for(const value of candidates){
    const safe = pickNonEmpty(value)
    if(safe){
      cachedCdnBase = safe.replace(/\/+$/, "")
      return cachedCdnBase
    }
  }

  throw new Error("CDN base URL not found. Expected window.MEDIA_CDN_BASE_URL.")
}

function getDeleteObjectEndpoint(){
  const supabaseUrl = pickNonEmpty(window.SUPABASE_URL) || "https://gnnaaagvlrmdveqxicob.supabase.co"
  return `${supabaseUrl}/functions/v1/delete-s3-object`
}

function normalizePath(value){
  return String(value || "").replace(/^\/+/, "").trim()
}

function joinCdnUrl(objectKey){
  const base = getCdnBaseUrl()
  const key = normalizePath(objectKey)
  if(!key) return ""
  return `${base}/${key}`
}

function validateImageFile(file){
  if(!file) throw new Error("No image file selected.")
  if(!String(file.type || "").startsWith("image/")){
    throw new Error("Selected file is not an image.")
  }
}

async function getCurrentUserSafe(){
  if(typeof window.getCurrentUser === "function"){
    return await window.getCurrentUser()
  }
  return null
}

async function getCurrentSessionSafe(){
  if(typeof window.getCurrentSession === "function"){
    return await window.getCurrentSession()
  }

  if(typeof window.getSupabase === "function"){
    const supabase = await window.getSupabase()
    const { data } = await supabase.auth.getSession()
    return data?.session || null
  }

  return null
}

function buildWebsiteObjectKey(userId, fileName){
  const safeUserId = normalizePath(userId)
  const safeFileName = String(fileName || "image.jpg")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "") || "image.jpg"

  const ext = safeFileName.includes(".") ? safeFileName.split(".").pop() : "jpg"
  const uniqueId = crypto.randomUUID()

  return `websites/${safeUserId}/${uniqueId}.${ext || "jpg"}`
}

function extractObjectKeyFromUrl(url){
  const safeUrl = pickNonEmpty(url)
  if(!safeUrl) return ""

  const cdnBase = (() => {
    try{
      return getCdnBaseUrl()
    }catch(_err){
      return ""
    }
  })()

  if(cdnBase && safeUrl.startsWith(cdnBase)){
    return normalizePath(safeUrl.slice(cdnBase.length))
  }

  try{
    const parsed = new URL(safeUrl)
    return normalizePath(parsed.pathname)
  }catch(_err){
    return ""
  }
}

async function callDeleteObjectFunction(payload){
  const session = await getCurrentSessionSafe()

  if(!session?.access_token){
    throw new Error("Authenticated session required for object deletion.")
  }

  const response = await fetch(getDeleteObjectEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": window.SUPABASE_ANON_KEY || "",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload || {})
  })

  let result = {}
  try{
    result = await response.json()
  }catch(_err){
    result = {}
  }

  if(!response.ok){
    throw new Error(result?.error || "S3 delete failed.")
  }

  return result
}

export async function uploadImage(file, options = {}){
  validateImageFile(file)

  if(typeof window.requestS3UploadUrl !== "function"){
    throw new Error("requestS3UploadUrl helper not found.")
  }

  if(typeof window.uploadFileToSignedS3Url !== "function"){
    throw new Error("uploadFileToSignedS3Url helper not found.")
  }

  const user = await getCurrentUserSafe()

  if(!user?.id){
    throw new Error("Authenticated user required.")
  }

  const objectKey =
    normalizePath(options.objectKey) ||
    buildWebsiteObjectKey(user.id, file.name)

  const originalFileSize = Number(file.size || 0)

  const signedUpload = await window.requestS3UploadUrl({
    eventId: options.eventId || `website-${user.id}`,
    fileName: objectKey.split("/").pop() || file.name || "image.jpg",
    contentType: file.type || "image/jpeg",

    // Storage reservation must receive original size for billable tracking.
    // This helper does not compress, so original and stored size are the same here.
    file_size: originalFileSize,
    original_file_size: originalFileSize,
    stored_file_size: originalFileSize,

    fileSize: originalFileSize,
    originalFileSize: originalFileSize,
    storedFileSize: originalFileSize
  })

  let uploadUrl = signedUpload.upload_url
  let finalObjectKey = signedUpload.object_key

  // If caller explicitly wants a website object key, prefer it using same signer contract if supported later.
  // Current signer returns its own object key; keep returned value as source of truth for no-break behavior.
  await window.uploadFileToSignedS3Url({
    uploadUrl,
    file,
    contentType: file.type || "image/jpeg"
  })

  return {
    url: joinCdnUrl(finalObjectKey),
    objectKey: finalObjectKey,
    publicId: finalObjectKey
  }
}

export async function deleteImageByUrl(url){
  const objectKey = extractObjectKeyFromUrl(url)

  if(!objectKey){
    return { skipped: true, reason: "No object key found." }
  }

  const result = await callDeleteObjectFunction({ object_key: objectKey })

  return {
    success: true,
    objectKey,
    result
  }
}

export async function replaceImageAsset({ oldUrl = "", file, folder = "" }){
  const uploaded = await uploadImage(file, { folder })

  let deleteResult = { skipped: true, reason: "No previous file." }

  if(oldUrl){
    try{
      deleteResult = await deleteImageByUrl(oldUrl)
    }catch(error){
      console.warn("Old S3 file cleanup skipped:", error)
      deleteResult = {
        skipped: true,
        reason: error.message || "Delete skipped"
      }
    }
  }

  return {
    newUrl: uploaded.url,
    oldUrl,
    deleteResult,
    objectKey: uploaded.objectKey
  }
}


// =============================
// TEMPLATE IMAGE SLOT SYSTEM
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

  const { newUrl, deleteResult, objectKey } = await replaceImageAsset({
    oldUrl,
    file,
    folder: `websites/${userId}`
  })

  const updatedImages = {
    ...existingImages,
    [slot]: newUrl
  }

  const existingImageKeys =
    currentData.template_image_keys && typeof currentData.template_image_keys === "object"
      ? currentData.template_image_keys
      : {}

  const updatedImageKeys = {
    ...existingImageKeys,
    [slot]: objectKey || extractObjectKeyFromUrl(newUrl)
  }

  const updatePayload = {
    template_images: updatedImages
  }

  // Safe optional support for future schema
  updatePayload.template_image_keys = updatedImageKeys

  const { error } = await supabase
    .from("user_websites")
    .update(updatePayload)
    .eq("id", websiteId)
    .eq("user_id", userId)

  if(error){
    throw new Error("Failed to update template images.")
  }

  return {
    slot,
    newUrl,
    objectKey: updatedImageKeys[slot],
    deleteResult
  }
}
