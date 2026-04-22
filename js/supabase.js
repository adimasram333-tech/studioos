// ================================
// SUPABASE CONFIG
// ================================

const SUPABASE_URL =
"https://gnnaaagvlrmdveqxicob.supabase.co"

const SUPABASE_ANON_KEY =
"sb_publishable_TnjoiedXWPbSjjqh2tmfsQ_kpiIMaND"

// ✅ global access for Razorpay + Edge Functions
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY

// ================================
// MEDIA / S3 CONFIG
// ================================

const MEDIA_CDN_BASE_URL =
"https://d12gq834fx4cn2.cloudfront.net"

const GENERATE_S3_UPLOAD_URL =
`${SUPABASE_URL}/functions/v1/generate-s3-upload-url`

const SAVE_S3_GALLERY_PHOTO_URL =
`${SUPABASE_URL}/functions/v1/save-s3-gallery-photo`

window.MEDIA_CDN_BASE_URL = MEDIA_CDN_BASE_URL
window.GENERATE_S3_UPLOAD_URL = GENERATE_S3_UPLOAD_URL
window.SAVE_S3_GALLERY_PHOTO_URL = SAVE_S3_GALLERY_PHOTO_URL


// ================================
// INTERNAL STATE
// ================================

let supabaseClient = null
let supabaseInitPromise = null


// ================================
// WAIT FOR CDN (FIXED: NO INFINITE LOOP)
// ================================

function waitForSupabaseCDN(timeoutMs = 10000){

return new Promise((resolve, reject)=>{

const start = Date.now()

const check = () => {

if(window.supabase && typeof window.supabase.createClient === "function"){
resolve()
return
}

if(Date.now() - start >= timeoutMs){
reject(new Error("Supabase CDN not loaded"))
return
}

setTimeout(check, 50)

}

check()

})

}


// ================================
// CREATE SUPABASE CLIENT (STABLE)
// ================================

async function initializeSupabase(){

if(window.supabaseClient){
return window.supabaseClient
}

if(supabaseInitPromise){
return supabaseInitPromise
}

supabaseInitPromise = (async ()=>{

try{

await waitForSupabaseCDN()

if(window.supabaseClient){
return window.supabaseClient
}

supabaseClient =
window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY,
{
auth:{
persistSession:true,
autoRefreshToken:true,
detectSessionInUrl:true
}
}
)

window.supabaseClient = supabaseClient

return supabaseClient

}catch(err){

supabaseInitPromise = null
console.error("Supabase initialization failed:", err)
throw err

}

})()

return supabaseInitPromise

}


// ================================
// SAFE SUPABASE ACCESS
// ================================

window.getSupabase = async function(){

if(window.supabaseClient){
return window.supabaseClient
}

return await initializeSupabase()

}


// ================================
// SAFE SESSION
// ================================

window.getCurrentSession = async function(){

try{

const supabase = await window.getSupabase()

if(!supabase) return null

const { data, error } = await supabase.auth.getSession()

if(error){
console.error("Session fetch error:", error)
return null
}

return data?.session || null

}catch(err){

console.error("Session fetch failed:", err)
return null

}

}


// ================================
// SAFE CURRENT USER
// ================================

window.getCurrentUser = async function(){

try{

const supabase = await window.getSupabase()

if(!supabase) return null

const { data, error } = await supabase.auth.getUser()

if(error){
console.error("User fetch error:", error)
return null
}

return data?.user || null

}catch(err){

console.error("User fetch failed:",err)
return null

}

}


// ================================
// MEDIA URL HELPERS
// ================================

function normalizeMediaPath(path){
if(!path) return ""
return String(path).replace(/^\/+/, "").trim()
}

function joinMediaUrl(base, path){
const safeBase = String(base || "").replace(/\/+$/, "")
const safePath = normalizeMediaPath(path)
if(!safeBase || !safePath) return ""
return `${safeBase}/${safePath}`
}

window.buildMediaUrl = function(input, variant = "original"){

if(!input) return ""

if(typeof input === "string"){
return joinMediaUrl(MEDIA_CDN_BASE_URL, input)
}

if(typeof input !== "object"){
return ""
}

const originalKey = normalizeMediaPath(input.object_key)
const previewKey = normalizeMediaPath(input.preview_key)
const thumbnailKey = normalizeMediaPath(input.thumbnail_key)
const legacyUrl = typeof input.image_url === "string" ? input.image_url.trim() : ""

if(variant === "thumbnail" && thumbnailKey){
return joinMediaUrl(MEDIA_CDN_BASE_URL, thumbnailKey)
}

if(variant === "preview" && previewKey){
return joinMediaUrl(MEDIA_CDN_BASE_URL, previewKey)
}

if(originalKey){
return joinMediaUrl(MEDIA_CDN_BASE_URL, originalKey)
}

return legacyUrl || ""

}

window.getBestMediaUrl = function(photoRow, preferredVariant = "preview"){

if(!photoRow) return ""

if(preferredVariant === "thumbnail"){
const thumbUrl = window.buildMediaUrl(photoRow, "thumbnail")
if(thumbUrl) return thumbUrl
}

if(preferredVariant === "preview"){
const previewUrl = window.buildMediaUrl(photoRow, "preview")
if(previewUrl) return previewUrl
}

const originalUrl = window.buildMediaUrl(photoRow, "original")
if(originalUrl) return originalUrl

return typeof photoRow.image_url === "string" ? photoRow.image_url.trim() : ""

}


// ================================
// EDGE FUNCTION FETCH HELPER
// ================================

async function callProtectedEdgeFunction(url, payload){

const session = await window.getCurrentSession()

if(!session?.access_token){
throw new Error("Authenticated session required.")
}

const response = await fetch(url, {
method: "POST",
headers: {
"Content-Type": "application/json",
"apikey": SUPABASE_ANON_KEY,
"Authorization": `Bearer ${session.access_token}`
},
body: JSON.stringify(payload || {})
})

let result = null

try{
result = await response.json()
}catch(err){
result = null
}

if(!response.ok){
throw new Error(result?.error || "Edge function request failed.")
}

return result

}


// ================================
// S3 SIGNED UPLOAD REQUEST
// ================================

window.requestS3UploadUrl = async function({
eventId,
fileName,
contentType
}){

if(!eventId) throw new Error("eventId is required.")
if(!fileName) throw new Error("fileName is required.")
if(!contentType) throw new Error("contentType is required.")

const result = await callProtectedEdgeFunction(
GENERATE_S3_UPLOAD_URL,
{
event_id: String(eventId),
file_name: String(fileName),
content_type: String(contentType)
}
)

if(!result?.success || !result?.upload_url || !result?.object_key){
throw new Error("Invalid S3 upload response.")
}

return result

}


// ================================
// DIRECT S3 PUT UPLOAD
// ================================

window.uploadFileToSignedS3Url = async function({
uploadUrl,
file,
contentType
}){

if(!uploadUrl) throw new Error("uploadUrl is required.")
if(!file) throw new Error("file is required.")

const response = await fetch(uploadUrl, {
method: "PUT",
headers: {
"Content-Type": contentType || file.type || "application/octet-stream"
},
body: file
})

if(!response.ok){
throw new Error("S3 upload failed.")
}

return true

}


// ================================
// SAVE S3 GALLERY PHOTO
// ================================

window.saveS3GalleryPhoto = async function({
eventId,
bucket,
objectKey,
fileSize = null,
width = null,
height = null,
thumbnailKey = null,
previewKey = null
}){

if(!eventId) throw new Error("eventId is required.")
if(!bucket) throw new Error("bucket is required.")
if(!objectKey) throw new Error("objectKey is required.")

const result = await callProtectedEdgeFunction(
SAVE_S3_GALLERY_PHOTO_URL,
{
event_id: String(eventId),
bucket: String(bucket),
object_key: String(objectKey),
file_size: typeof fileSize === "number" ? fileSize : null,
width: typeof width === "number" ? width : null,
height: typeof height === "number" ? height : null,
thumbnail_key: thumbnailKey ? String(thumbnailKey) : null,
preview_key: previewKey ? String(previewKey) : null
}
)

if(!result?.success || !result?.photo){
throw new Error("S3 gallery photo save failed.")
}

return result.photo

}


// ================================
// IMAGE METADATA HELPER
// ================================

window.readImageDimensions = async function(file){

if(!file) return { width: null, height: null }

return await new Promise((resolve) => {
try{
const objectUrl = URL.createObjectURL(file)
const img = new Image()

img.onload = function(){
const width = Number(img.naturalWidth || img.width || 0) || null
const height = Number(img.naturalHeight || img.height || 0) || null
URL.revokeObjectURL(objectUrl)
resolve({ width, height })
}

img.onerror = function(){
URL.revokeObjectURL(objectUrl)
resolve({ width: null, height: null })
}

img.src = objectUrl
}catch(err){
resolve({ width: null, height: null })
}
})

}


// ================================
// PRELOAD SUPABASE
// ================================

initializeSupabase().catch(err=>{
console.error("Supabase preload failed:", err)
})


// ================================
// SAVE QUOTATION
// ================================

window.saveQuotation = async function(data){

const supabase = await window.getSupabase()
if(!supabase) return null

try{

const { data: result, error } =
await supabase
.from("quotations")
.insert([data])
.select()
.single()

if(error){

console.error("Supabase Save Error:",error)
return null

}

return result

}catch(err){

console.error("Save quotation failed:",err)
return null

}

}


// ================================
// GET QUOTATION BY ID
// ================================

window.getQuotationById = async function(id){

const supabase = await window.getSupabase()
if(!supabase) return null

try{

const { data, error } =
await supabase
.from("quotations")
.select("*")
.eq("id", id)
.single()

if(error){

console.error("Fetch quotation error:",error)
return null

}

return data

}catch(err){

console.error("Fetch quotation failed:",err)
return null

}

}


// ================================
// GET QUOTATION BY SHORT ID
// ================================

window.getQuotationByShortId = async function(shortId){

const supabase = await window.getSupabase()
if(!supabase) return null

try{

const { data, error } =
await supabase
.from("quotations")
.select("*")
.eq("short_id", shortId)
.single()

if(error){

console.error("Fetch short quotation error:",error)
return null

}

return data

}catch(err){

console.error("Fetch short quotation failed:",err)
return null

}

}


// ================================
// GET ALL QUOTATIONS
// ================================

window.getAllQuotations = async function(){

const supabase = await window.getSupabase()
if(!supabase) return []

try{

const { data, error } =
await supabase
.from("quotations")
.select("*")
.order("created_at",{ ascending:false })

if(error){

console.error("Fetch quotations error:",error)
return []

}

return data

}catch(err){

console.error("Fetch quotations failed:",err)
return []

}

}


// ================================
// PHOTOGRAPHER SETTINGS
// ================================

window.getPhotographerSettings = async function(userId){

const supabase = await window.getSupabase()
if(!supabase) return null

try{

const { data, error } =
await supabase
.from("photographer_settings")
.select("*")
.eq("user_id", userId)
.maybeSingle()

if(error){

console.log("No settings yet")
return null

}

return data

}catch(err){

console.error("Settings fetch failed:",err)
return null

}

}


// ================================
// LEGACY GALLERY SAVE (DO NOT USE FOR NEW S3 FLOW)
// ================================

window.saveGalleryImages = async function(images){

const supabase = await window.getSupabase()
if(!supabase) return false

try{

const user = await window.getCurrentUser()

const safeImages = images.map(img => ({
...img,
user_id: img.user_id || user?.id || null
}))

const { error } =
await supabase
.from("gallery_photos")
.insert(safeImages)

if(error){

console.error("Gallery save error:",error)
return false

}

return true

}catch(err){

console.error("Gallery save failed:",err)
return false

}

}
