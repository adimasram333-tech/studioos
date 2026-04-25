// =============================
// SAFE SUPABASE ACCESS
// =============================

async function getSupabase(){

if(window.getSupabase && window.getSupabase !== getSupabase){
return await window.getSupabase()
}

if(window.supabaseClient){
return window.supabaseClient
}

throw new Error("Supabase client not initialized")

}

async function getCurrentUser(){

if(window.getCurrentUser && window.getCurrentUser !== getCurrentUser){
return await window.getCurrentUser()
}

const supabase = await getSupabase()

try{

const { data, error } = await supabase.auth.getUser()

if(error){
console.error("Auth error", error)
return null
}

return data?.user || null

}catch(err){
console.error("Auth crash", err)
return null
}

}

async function getCurrentSessionAccessToken(){

try{
const supabase = await getSupabase()
const { data, error } = await supabase.auth.getSession()

if(error){
console.error("Session fetch error", error)
return null
}

return data?.session?.access_token || null
}catch(err){
console.error("Session fetch crash", err)
return null
}

}

function isSafeS3ObjectKey(key, userId, eventId){
const cleanKey = String(key || "").replace(/^\/+/, "").trim()

if(!cleanKey || !userId || !eventId){
return false
}

const allowedPrefixes = [
`${userId}/${eventId}/original/`,
`${userId}/${eventId}/preview/`,
`${userId}/${eventId}/thumb/`,
`${userId}/${eventId}/originals/`,
`${userId}/${eventId}/previews/`,
`${userId}/${eventId}/thumbs/`,

`tenant/${userId}/event/${eventId}/original/`,
`tenant/${userId}/event/${eventId}/preview/`,
`tenant/${userId}/event/${eventId}/thumb/`,
`tenant/${userId}/event/${eventId}/originals/`,
`tenant/${userId}/event/${eventId}/previews/`,
`tenant/${userId}/event/${eventId}/thumbs/`
]

return allowedPrefixes.some(prefix => cleanKey.startsWith(prefix))
}

async function triggerImageProcessingJob(objectKey, eventId){

try{
const accessToken = await getCurrentSessionAccessToken()

if(!accessToken){
console.error("Process-image trigger skipped: missing authenticated session")
return { success: false, reason: "missing_session" }
}

const response = await fetch("https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/process-image", {
method: "POST",
headers: {
"Content-Type": "application/json",
"apikey": window.SUPABASE_ANON_KEY || "",
"Authorization": `Bearer ${accessToken}`
},
body: JSON.stringify({
object_key: String(objectKey),
event_id: String(eventId)
})
})

let result = null
try{
result = await response.json()
}catch(_err){
result = null
}

if(!response.ok){
console.error("Process-image trigger failed", result || response.status)
return { success: false, reason: "process_image_failed", status: response.status, result }
}

return { success: true, result }
}catch(err){
console.error("Process-image trigger failed", err)
return { success: false, reason: "process_image_crashed" }
}

}


function sleep(ms){
return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableUploadError(err){
const message = extractErrorMessage(err).toLowerCase()

return (
message.includes("network") ||
message.includes("failed to fetch") ||
message.includes("timeout") ||
message.includes("temporarily") ||
message.includes("s3 upload failed") ||
message.includes("edge function request failed")
)
}

async function runWithRetry(task, options = {}){
const retries = Number(options.retries || 2)
const baseDelay = Number(options.baseDelay || 700)
let lastError = null

for(let attempt = 0; attempt <= retries; attempt++){
try{
return await task(attempt)
}catch(err){
lastError = err

if(attempt >= retries || !isRetryableUploadError(err)){
throw err
}

await sleep(baseDelay * Math.pow(2, attempt))
}
}

throw lastError || new Error("Operation failed")
}

function getRollbackS3UploadUrl(){
if(window.ROLLBACK_S3_UPLOAD_URL){
return window.ROLLBACK_S3_UPLOAD_URL
}

if(window.GENERATE_S3_UPLOAD_URL){
return String(window.GENERATE_S3_UPLOAD_URL).replace("/generate-s3-upload-url", "/rollback-s3-upload")
}

return "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/rollback-s3-upload"
}

async function rollbackUploadedS3Object(objectKey, eventId, userId){
try{
const cleanKey = String(objectKey || "").replace(/^\/+/, "").trim()

if(!cleanKey || !eventId || !userId){
return { success: false, reason: "missing_rollback_params" }
}

if(!isSafeS3ObjectKey(cleanKey, userId, String(eventId))){
console.error("Rollback skipped: unsafe object key", cleanKey)
return { success: false, reason: "unsafe_key" }
}

const accessToken = await getCurrentSessionAccessToken()

if(!accessToken){
console.error("Rollback skipped: missing authenticated session")
return { success: false, reason: "missing_session" }
}

const response = await fetch(getRollbackS3UploadUrl(), {
method: "POST",
headers: {
"Content-Type": "application/json",
"apikey": window.SUPABASE_ANON_KEY || "",
"Authorization": `Bearer ${accessToken}`
},
body: JSON.stringify({
event_id: String(eventId),
object_key: cleanKey
})
})

let result = null
try{
result = await response.json()
}catch(_err){
result = null
}

if(!response.ok || !result?.success){
console.error("S3 rollback failed", result || response.status)
return { success: false, reason: "rollback_failed", status: response.status, result }
}

return { success: true, result }
}catch(err){
console.error("S3 rollback crashed", err)
return { success: false, reason: "rollback_crashed" }
}
}


// =============================
// IMAGE HELPERS
// =============================

function sanitizeFileName(fileName){
return String(fileName || "image.jpg")
.trim()
.toLowerCase()
.replace(/\s+/g, "-")
.replace(/[^a-z0-9.\-_]/g, "") || "image.jpg"
}

async function readImageDimensionsLocal(file){

return await new Promise((resolve)=>{
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

function resolveMediaUrlFromPhoto(photo){
if(!photo) return ""

if(typeof window.getBestMediaUrl === "function"){
const best = window.getBestMediaUrl(photo, "original")
if(best) return best
}

if(typeof window.buildMediaUrl === "function"){
if(photo.object_key){
return window.buildMediaUrl(photo.object_key)
}
if(typeof photo === "string"){
return window.buildMediaUrl(photo)
}
}

return ""
}


function extractErrorMessage(err){
if(!err) return "Upload failed"

if(typeof err === "string"){
return err
}

if(typeof err?.message === "string" && err.message.trim()){
return err.message.trim()
}

if(typeof err?.error === "string" && err.error.trim()){
return err.error.trim()
}

return "Upload failed"
}

function isStorageLimitError(err){
const message = extractErrorMessage(err).toLowerCase()
const code = String(err?.code || "").toLowerCase()

return (
code === "storage_limit_exceeded" ||
message.includes("storage limit exceeded") ||
message.includes("storage full") ||
message.includes("upgrade your plan")
)
}


// =============================
// BACKEND FACE PROCESSING
// =============================

// Face processing is handled by the backend process-image pipeline.
// Browser-side face-api processing is intentionally disabled for production scalability.


// =============================
// AUTO FIX OLD BOOKINGS
// =============================

async function autoFixOldBookings(){

try{

const supabase = await getSupabase()
const user = await getCurrentUser()

if(!user) return

const { data: quotations } = await supabase
.from("quotations")
.select("*")
.eq("user_id", user.id)
.eq("status", "confirmed")

if(!quotations) return

for(const q of quotations){

const eventName = "Q_" + q.id

const { data: existing } = await supabase
.from("events")
.select("id")
.eq("event_name", eventName)

if(existing && existing.length > 0){
continue
}

const { data: eventData, error } = await supabase
.from("events")
.insert([{
user_id: user.id,
client_name: q.client_name,
event_name: eventName,
event_type: q.event_category || "event",
event_date: q.event_date,
status: "active"
}])
.select()
.single()

if(error){
console.error("AUTO EVENT ERROR", error)
continue
}

const token =
Math.random().toString(36).substring(2,10).toUpperCase()

await supabase
.from("event_tokens")
.insert([{
event_id: eventData.id,
token: token,
used: false
}])

}

console.log("Old bookings auto-fixed ✅")

}catch(err){
console.error("Auto fix error", err)
}

}


// =============================
// GET EVENT FROM URL
// =============================

function getEventFromURL(){
const params = new URLSearchParams(window.location.search)
return params.get("event_id") || params.get("event")
}


// =============================
// LOAD EVENTS
// =============================

async function loadConfirmedEvents(selectedEventId = null){

try{

const select = document.getElementById("eventSelect")

if(!select){
return
}

const supabase = await getSupabase()
const user = await getCurrentUser()

if(!user){
return
}

if(!localStorage.getItem("oldBookingsFixed")){
await autoFixOldBookings()
localStorage.setItem("oldBookingsFixed","true")
}

const { data: events, error } = await supabase
.from("events")
.select("*")
.eq("user_id", user.id)

if(error){
console.error("Events error", error)
}

const safeEvents = (events || []).filter(e => e && e.id)

safeEvents.sort((a, b) => {
const aEventDate = a?.event_date ? new Date(a.event_date).getTime() : 0
const bEventDate = b?.event_date ? new Date(b.event_date).getTime() : 0

if(bEventDate !== aEventDate){
return bEventDate - aEventDate
}

const aCreatedAt = a?.created_at ? new Date(a.created_at).getTime() : 0
const bCreatedAt = b?.created_at ? new Date(b.created_at).getTime() : 0

return bCreatedAt - aCreatedAt
})

select.innerHTML = `
<option value="">Select Event</option>
<option value="create_new">+ Create New Event</option>
`

safeEvents.forEach(e => {

const option = document.createElement("option")

option.value = String(e.id)

const displayName = e.client_name || e.event_name || "Event"
const dateText = e.event_date ? ` (${e.event_date})` : ""

option.textContent = `${displayName}${dateText}`

select.appendChild(option)

})

const createEventBox = document.getElementById("createEventBox")

if(selectedEventId){
select.value = String(selectedEventId)
if(createEventBox){
createEventBox.style.display = "none"
}
}else{
const urlEvent = getEventFromURL()
if(urlEvent){
select.value = String(urlEvent)
if(createEventBox){
createEventBox.style.display = "none"
}
}
}

}catch(err){
console.error("Dropdown load error",err)
}

}

window.loadConfirmedEvents = loadConfirmedEvents


// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded",()=>{
loadConfirmedEvents()
})


// =============================
// HELPERS
// =============================

function getEventId(){
const select = document.getElementById("eventSelect")
if(!select || !select.value){
return null
}
return String(select.value)
}

async function runWithConcurrency(items, worker, limit = 3){

const results = new Array(items.length)
let currentIndex = 0

async function runner(){
while(true){
const index = currentIndex++
if(index >= items.length){
return
}

try{
results[index] = await worker(items[index], index)
}catch(err){
results[index] = { error: err }
}
}
}

const count = Math.min(limit, items.length)
const runners = []

for(let i=0;i<count;i++){
runners.push(runner())
}

await Promise.all(runners)

return results
}

function getAdaptiveUploadConcurrency(files){

const list = Array.isArray(files) ? files : []
const totalBytes = list.reduce((sum, file) => sum + Number(file?.size || 0), 0)
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null
const effectiveType = String(connection?.effectiveType || "").toLowerCase()
const downlink = Number(connection?.downlink || 0)
const saveData = !!connection?.saveData
const isMobile =
/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || "") ||
window.innerWidth < 768

if(saveData){
return 2
}

if(effectiveType.includes("2g")){
return 2
}

if(effectiveType.includes("3g")){
return isMobile ? 2 : 3
}

if(totalBytes >= 1024 * 1024 * 1024){
return isMobile ? 3 : 6
}

if(downlink && downlink < 5){
return isMobile ? 2 : 3
}

if(isMobile){
return 3
}

if(list.length >= 50){
return 6
}

return 5
}

function sortFilesForUpload(files){
return [...files].sort((a, b) => Number(b?.size || 0) - Number(a?.size || 0))
}


// =============================
// S3 UPLOAD HELPERS
// =============================

async function uploadSingleImageToS3(file, eventId, user){

if(typeof window.requestS3UploadUrl !== "function"){
throw new Error("S3 upload signer not loaded")
}

if(typeof window.uploadFileToSignedS3Url !== "function"){
throw new Error("S3 uploader not loaded")
}

if(typeof window.saveS3GalleryPhoto !== "function"){
throw new Error("S3 gallery saver not loaded")
}

const safeFileName = sanitizeFileName(file.name || "image.jpg")
const dimensionsPromise = readImageDimensionsLocal(file)

if(!user || !user.id){
throw new Error("Login required")
}

let signedUpload = null

try{
signedUpload = await window.requestS3UploadUrl({
// permanent compatibility fix: send both backend-safe snake_case and helper-safe camelCase
event_id: String(eventId),
file_name: safeFileName,
content_type: file.type || "image/jpeg",
file_size: Number(file.size || 0),
eventId: String(eventId),
fileName: safeFileName,
contentType: file.type || "image/jpeg",
fileSize: Number(file.size || 0)
})
}catch(err){
if(isStorageLimitError(err)){
const storageError = new Error("Your storage is full. Please upgrade your plan to upload more photos.")
storageError.code = "storage_limit_exceeded"
throw storageError
}
throw err
}

if(!signedUpload || !signedUpload.upload_url || !signedUpload.object_key){
throw new Error("Invalid S3 upload signer response")
}

if(!isSafeS3ObjectKey(signedUpload.object_key, user.id, String(eventId))){
throw new Error("Unsafe S3 object key returned by upload signer")
}

await runWithRetry(
async () => await window.uploadFileToSignedS3Url({
uploadUrl: signedUpload.upload_url,
file,
contentType: file.type || "image/jpeg"
}),
{ retries: 2, baseDelay: 900 }
)

const dimensions = await dimensionsPromise

let savedPhoto = null

try{
savedPhoto = await runWithRetry(
async () => await window.saveS3GalleryPhoto({
// permanent compatibility fix: support both normalized backend payload and existing helper payload
event_id: String(eventId),
bucket: signedUpload.bucket,
object_key: signedUpload.object_key,
file_size: Number(file.size || 0) || null,
width: dimensions.width,
height: dimensions.height,
thumbnail_key: null,
preview_key: null,
eventId: String(eventId),
objectKey: signedUpload.object_key,
fileSize: Number(file.size || 0) || null,
thumbnailKey: null,
previewKey: null
}),
{ retries: 1, baseDelay: 800 }
)
}catch(saveErr){
await rollbackUploadedS3Object(signedUpload.object_key, String(eventId), user.id)
throw saveErr
}

// 🔥 TRIGGER IMAGE PROCESSING (NON-BLOCKING, AUTHENTICATED)
triggerImageProcessingJob(signedUpload.object_key, String(eventId))

const fileUrl = resolveMediaUrlFromPhoto(savedPhoto) || resolveMediaUrlFromPhoto({
object_key: signedUpload.object_key
})

return {
success: true,
file,
photo: savedPhoto,
url: fileUrl,
objectKey: signedUpload.object_key
}

}


// =============================
// UPLOAD SYSTEM (S3 PRODUCTION PATH)
// =============================

async function uploadImages(finalEventId){

const input = document.getElementById("images")
const status = document.getElementById("status")
const progress = document.getElementById("progress")

if(!input){
console.error("Image input missing")
return
}

const files = input.files

if(!files || !files.length){
status.innerText = "Please select images or folder"
return
}

const user = await getCurrentUser()

if(!user){
status.innerText = "Login required"
return
}

let eventId = finalEventId

if(!eventId){
eventId = getEventId()
}

if(!eventId){
eventId = getEventFromURL()
}

if(eventId === "create_new"){
status.innerText = "Invalid event selection"
return
}

if(!eventId){
status.innerText = "Please select event"
return
}

eventId = String(eventId)

status.innerText = "Uploading photos..."
progress.innerText = ""

let uploaded = 0
let savedFacesImages = 0
let totalFacesDetected = 0
let skippedFaceImages = 0
const skippedFiles = []

const validFiles =
[...files].filter(file => file && file.type && file.type.startsWith("image/"))

if(validFiles.length === 0){
status.innerText = "No valid images selected"
return
}

const uploadQueue = sortFilesForUpload(validFiles)
const uploadConcurrency = getAdaptiveUploadConcurrency(uploadQueue)

progress.innerText = `Preparing upload • ${uploadConcurrency} parallel uploads`

const uploadResults = await runWithConcurrency(
uploadQueue,
async (file) => {
try{
const result = await uploadSingleImageToS3(file, eventId, user)

if(result?.success && result?.photo){
uploaded++
progress.innerText = `Uploading ${uploaded} / ${uploadQueue.length}`
return result
}

return {
success: false,
file,
reason: "upload_failed"
}

}catch(err){
console.error("S3 upload error", err)
return {
success: false,
file,
reason: extractErrorMessage(err),
code: err?.code || null
}
}
},
uploadConcurrency
)

const successfulUploads = (uploadResults || []).filter(item => item && item.success && item.photo)
const failedUploads = (uploadResults || []).filter(item => item && !item.success)

const storageLimitFailure = failedUploads.find(item => String(item?.code || "").toLowerCase() === "storage_limit_exceeded")

if(storageLimitFailure){
status.innerText = "Storage full. Upgrade your plan to continue uploads."
progress.innerText = ""
alert("Your storage is full. Please upgrade your plan to upload more photos.")
return
}

failedUploads.forEach(item => {
skippedFaceImages++
skippedFiles.push({
name: item?.file?.name || "unknown",
reason: item?.reason || "upload_failed"
})
})

if(!successfulUploads.length){
status.innerText = "Upload failed"
progress.innerText = ""
return
}

status.innerText = "Upload Complete"
progress.innerText =
`${successfulUploads.length} photos uploaded • Backend processing started`

if(skippedFiles.length > 0){
console.warn("Skipped files:", skippedFiles)
}

// Backend processing is triggered per upload by process-image.
// No browser-side face processing runs here.
// Preview/thumbnail/AI status will be finalized by backend processing.

if(progress){
progress.innerText =
`${successfulUploads.length} photos uploaded • Processing continues in backend`
}


await loadConfirmedEvents(eventId)

if(typeof window.onUploadComplete === "function"){
window.onUploadComplete(eventId)
}

}

window.uploadImages = uploadImages
