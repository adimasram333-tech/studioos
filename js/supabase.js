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

const BLOCKED_USER_CACHE_TTL_MS = 30000
const STUDIOOS_BLOCKED_FLAG_KEY = "studioos_account_blocked"
let blockedUserCache = {
userId: null,
isBlocked: false,
checkedAt: 0
}
let blockedAccountOverlayVisible = false


// ================================
// BLOCKED USER PROTECTION
// ================================

function getCurrentPageName(){
try{
const path = window.location.pathname || ""
return path.split("/").pop() || ""
}catch(e){
return ""
}
}

function isAdminRoute(){
try{
return String(window.location.pathname || "").includes("/studioos-admin/")
}catch(e){
return false
}
}

function isPublicGuestAccessPage(){
const page = getCurrentPageName().toLowerCase()
return page === "access.html"
}

function isBlockedGuardSafePage(){
const page = getCurrentPageName().toLowerCase()
return page === "" || page === "index.html" || page === "login.html" || page === "signup.html"
}

function setStudioOSBlockedFlag(value){
try{
if(value){
localStorage.setItem(STUDIOOS_BLOCKED_FLAG_KEY, "true")
}else{
localStorage.removeItem(STUDIOOS_BLOCKED_FLAG_KEY)
}
}catch(e){}
}

function hasStudioOSBlockedFlag(){
try{
return localStorage.getItem(STUDIOOS_BLOCKED_FLAG_KEY) === "true"
}catch(e){
return false
}
}

function clearStudioOSAppSession(){
try{
sessionStorage.clear()
}catch(e){}
}

function showBlockedAccountOverlay(){
if(blockedAccountOverlayVisible){
return
}

blockedAccountOverlayVisible = true

try{
document.body.style.overflow = "hidden"
}catch(e){}

const existing = document.getElementById("studioosBlockedAccountOverlay")
if(existing){
existing.remove()
}

const overlay = document.createElement("div")
overlay.id = "studioosBlockedAccountOverlay"
overlay.style.position = "fixed"
overlay.style.inset = "0"
overlay.style.zIndex = "2147483647"
overlay.style.display = "flex"
overlay.style.alignItems = "center"
overlay.style.justifyContent = "center"
overlay.style.padding = "1rem"
overlay.style.background = "rgba(2,6,23,0.88)"
overlay.style.backdropFilter = "blur(12px)"
overlay.style.color = "#ffffff"

overlay.innerHTML = `
  <div style="
    width:min(100%, 420px);
    border-radius:1.4rem;
    padding:1.25rem;
    background:rgba(15,23,42,0.98);
    border:1px solid rgba(255,255,255,0.10);
    box-shadow:0 28px 90px rgba(0,0,0,0.45);
    text-align:left;
  ">
    <div style="
      display:inline-flex;
      align-items:center;
      padding:0.36rem 0.7rem;
      border-radius:999px;
      font-size:0.7rem;
      font-weight:900;
      letter-spacing:0.12em;
      text-transform:uppercase;
      color:#fecaca;
      background:rgba(239,68,68,0.14);
      border:1px solid rgba(239,68,68,0.28);
    ">Account Blocked</div>

    <div style="
      margin-top:0.9rem;
      font-size:1.28rem;
      line-height:1.55rem;
      font-weight:900;
      color:#ffffff;
    ">Your StudioOS account is blocked</div>

    <div style="
      margin-top:0.55rem;
      color:rgba(255,255,255,0.72);
      font-size:0.9rem;
      line-height:1.55;
    ">You cannot access StudioOS pages or use app features right now. Please contact StudioOS support.</div>

    <button id="studioosBlockedLogoutBtn" type="button" style="
      margin-top:1rem;
      width:100%;
      min-height:46px;
      border-radius:0.95rem;
      border:1px solid rgba(255,255,255,0.10);
      background:rgb(79,70,229);
      color:#ffffff;
      font-size:0.9rem;
      font-weight:850;
      cursor:pointer;
    ">Go to Login</button>
  </div>
`

document.body.appendChild(overlay)

const button = document.getElementById("studioosBlockedLogoutBtn")
if(button){
button.onclick = async function(){
try{
const supabase = await window.getSupabase()
if(supabase){
await supabase.auth.signOut()
}
}catch(e){}
clearStudioOSAppSession()
window.location.href = "login.html"
}
}
}

async function handleBlockedStudioOSUser(){
setStudioOSBlockedFlag(true)
clearStudioOSAppSession()

try{
const supabase = await window.getSupabase()
if(supabase){
await supabase.auth.signOut()
}
}catch(e){
console.warn("Blocked user sign out skipped:", e)
}

showBlockedAccountOverlay()
}

async function isStudioOSUserBlocked(userId){
const safeUserId = String(userId || "").trim()
if(!safeUserId){
return false
}

if(
blockedUserCache.userId === safeUserId &&
Date.now() - blockedUserCache.checkedAt < BLOCKED_USER_CACHE_TTL_MS
){
return blockedUserCache.isBlocked === true
}

try{
const supabase = await window.getSupabase()
if(!supabase){
return false
}

const { data, error } = await supabase
.from("photographer_settings")
.select("is_blocked")
.eq("user_id", safeUserId)
.maybeSingle()

if(error){
console.error("Blocked user check failed:", error)
return false
}

const isBlocked = data?.is_blocked === true

blockedUserCache = {
userId: safeUserId,
isBlocked,
checkedAt: Date.now()
}

if(!isBlocked){
setStudioOSBlockedFlag(false)
}

return isBlocked
}catch(err){
console.error("Blocked user check error:", err)
return false
}
}

window.getCurrentUserWithoutBlockCheck = async function(){

try{

const supabase = await window.getSupabase()

if(!supabase) return null

const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

if(sessionError){
console.error("Session fetch error:", sessionError)
return null
}

if(!sessionData?.session?.access_token){
return null
}

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

window.ensureActiveStudioOSAccount = async function(user = null){
if(isAdminRoute()){
return user || await window.getCurrentUserWithoutBlockCheck()
}

const currentUser = user || await window.getCurrentUserWithoutBlockCheck()
const userId = currentUser?.id || ""

if(!userId){
if(hasStudioOSBlockedFlag() && !isPublicGuestAccessPage() && !isBlockedGuardSafePage()){
showBlockedAccountOverlay()
}
return null
}

const blocked = await isStudioOSUserBlocked(userId)

if(blocked){
await handleBlockedStudioOSUser()
return null
}

return currentUser
}

window.runStudioOSBlockedUserGuard = async function(){
if(isAdminRoute()){
return
}

const user = await window.getCurrentUserWithoutBlockCheck()

if(user?.id){
await window.ensureActiveStudioOSAccount(user)
return
}

if(hasStudioOSBlockedFlag() && !isPublicGuestAccessPage() && !isBlockedGuardSafePage()){
showBlockedAccountOverlay()
}
}


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

const user = await window.getCurrentUserWithoutBlockCheck()

if(!user){
return null
}

return await window.ensureActiveStudioOSAccount(user)

}catch(err){

console.error("User fetch failed:",err)
return null

}

}


// ================================
// MEDIA URL HELPERS (S3 / CLOUDFRONT ONLY)
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

if(variant === "thumbnail" && thumbnailKey){
return joinMediaUrl(MEDIA_CDN_BASE_URL, thumbnailKey)
}

if(variant === "preview" && previewKey){
return joinMediaUrl(MEDIA_CDN_BASE_URL, previewKey)
}

if(originalKey){
return joinMediaUrl(MEDIA_CDN_BASE_URL, originalKey)
}

return ""

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

return ""

}


// ================================
// EDGE FUNCTION FETCH HELPER
// ================================

async function callProtectedEdgeFunction(url, payload){

const activeUser = await window.ensureActiveStudioOSAccount()

if(!activeUser){
throw new Error("Account access blocked or authentication required.")
}

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
const error = new Error(result?.error || "Edge function request failed.")
if(result?.code){
error.code = result.code
}
if(result?.details){
error.details = result.details
}
throw error
}

return result

}


// ================================
// S3 SIGNED UPLOAD REQUEST
// ================================

window.requestS3UploadUrl = async function(payload = {}){

const eventId = payload.event_id ?? payload.eventId
const websiteId = payload.website_id ?? payload.websiteId
const slot = payload.slot ?? payload.image_slot ?? payload.imageSlot
const uploadContextRaw = payload.upload_context ?? payload.uploadContext
const uploadContext = String(uploadContextRaw || "").trim().toLowerCase()

const isWebsiteTemplateUpload =
uploadContext === "website_template" ||
uploadContext === "website" ||
uploadContext === "template" ||
uploadContext === "builder"

const fileName = payload.file_name ?? payload.fileName
const contentType = payload.content_type ?? payload.contentType

const storedSizeRaw =
payload.stored_file_size ??
payload.storedFileSize ??
payload.file_size ??
payload.fileSize

const originalSizeRaw =
payload.original_file_size ??
payload.originalFileSize

if(isWebsiteTemplateUpload){
if(!websiteId) throw new Error("website_id is required.")
if(!slot) throw new Error("slot is required.")
}else{
if(!eventId) throw new Error("event_id is required.")
}

if(!fileName) throw new Error("file_name is required.")
if(!contentType) throw new Error("content_type is required.")

const storedFileSize = Number(storedSizeRaw)
const originalFileSize = Number(originalSizeRaw)

if(!Number.isFinite(storedFileSize) || storedFileSize <= 0){
throw new Error("stored_file_size is required.")
}

if(!Number.isFinite(originalFileSize) || originalFileSize <= 0){
throw new Error("original_file_size is required.")
}

const normalizedStoredSize = Math.floor(storedFileSize)
const normalizedOriginalSize = Math.floor(originalFileSize)

const requestPayload = {
file_name: String(fileName),
content_type: String(contentType),

// Billing must always use original selected file size.
// S3 upload stores the compressed file size.
file_size: normalizedStoredSize,
original_file_size: normalizedOriginalSize,
stored_file_size: normalizedStoredSize,

// Backward-compatible aliases for any future helper/edge compatibility.
fileName: String(fileName),
contentType: String(contentType),
fileSize: normalizedStoredSize,
originalFileSize: normalizedOriginalSize,
storedFileSize: normalizedStoredSize
}

if(isWebsiteTemplateUpload){
requestPayload.upload_context = "website_template"
requestPayload.uploadContext = "website_template"
requestPayload.website_id = String(websiteId)
requestPayload.websiteId = String(websiteId)
requestPayload.slot = String(slot)
requestPayload.image_slot = String(slot)
requestPayload.imageSlot = String(slot)
}else{
requestPayload.event_id = String(eventId)
requestPayload.eventId = String(eventId)
}

const result = await callProtectedEdgeFunction(
GENERATE_S3_UPLOAD_URL,
requestPayload
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

window.saveS3GalleryPhoto = async function(payload = {}){

const eventId = payload.event_id ?? payload.eventId
const bucket = payload.bucket
const objectKey = payload.object_key ?? payload.objectKey

const storedSizeRaw =
payload.stored_file_size ??
payload.storedFileSize ??
payload.file_size ??
payload.fileSize ??
null

const originalSizeRaw =
payload.original_file_size ??
payload.originalFileSize ??
null

const widthRaw = payload.width ?? null
const heightRaw = payload.height ?? null
const thumbnailKey = payload.thumbnail_key ?? payload.thumbnailKey ?? null
const previewKey = payload.preview_key ?? payload.previewKey ?? null

if(!eventId) throw new Error("event_id is required.")
if(!bucket) throw new Error("bucket is required.")
if(!objectKey) throw new Error("object_key is required.")

const storedFileSize = storedSizeRaw === null ? null : Number(storedSizeRaw)
const originalFileSize = originalSizeRaw === null ? null : Number(originalSizeRaw)
const width = widthRaw === null ? null : Number(widthRaw)
const height = heightRaw === null ? null : Number(heightRaw)

if(!Number.isFinite(storedFileSize) || storedFileSize <= 0){
throw new Error("stored_file_size is required.")
}

if(!Number.isFinite(originalFileSize) || originalFileSize <= 0){
throw new Error("original_file_size is required.")
}

const normalizedStoredSize = Math.floor(storedFileSize)
const normalizedOriginalSize = Math.floor(originalFileSize)

const result = await callProtectedEdgeFunction(
SAVE_S3_GALLERY_PHOTO_URL,
{
event_id: String(eventId),
bucket: String(bucket),
object_key: String(objectKey),

// Billing must always use original selected file size.
// S3/internal storage tracking uses compressed uploaded size.
file_size: normalizedStoredSize,
original_file_size: normalizedOriginalSize,
stored_file_size: normalizedStoredSize,

// Backward-compatible aliases for any future helper/edge compatibility.
fileSize: normalizedStoredSize,
originalFileSize: normalizedOriginalSize,
storedFileSize: normalizedStoredSize,

width: Number.isFinite(width) ? Math.floor(width) : null,
height: Number.isFinite(height) ? Math.floor(height) : null,
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

initializeSupabase()
.then(()=>{
if(document.readyState === "loading"){
document.addEventListener("DOMContentLoaded", ()=>{
window.runStudioOSBlockedUserGuard().catch(err=>{
console.error("Blocked user guard failed:", err)
})
})
}else{
window.runStudioOSBlockedUserGuard().catch(err=>{
console.error("Blocked user guard failed:", err)
})
}
})
.catch(err=>{
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
