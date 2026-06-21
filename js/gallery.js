// =============================
// GLOBAL MENU SYSTEM (S3 ONLY)
// =============================

let activeMenu = null
let FACE_FILTER_ACTIVE = false
let CURRENT_GALLERY_STATE = {
eventId: null,
effectiveRole: "guest",
matchedImages: new Set()
}

const GALLERY_RENDER_BATCH_SIZE = 80
const GALLERY_RENDER_IDLE_DELAY = 16
const GALLERY_PRIORITY_IMAGE_COUNT = 12
const GALLERY_PRELOAD_AHEAD_COUNT = 18
const GALLERY_IMAGE_OBSERVER_ROOT_MARGIN = "900px 0px"
const MODAL_PRELOAD_RANGE = 2
const IMAGE_PRELOAD_CACHE_LIMIT = 300

const galleryPreviewPreloadCache = new Map()
const modalImagePreloadCache = new Map()

function buildGuestDownloadLabel(isFree){
return isFree ? "Guest Free Download: ON" : "Guest Free Download: OFF"
}

function normalizeGallerySharingStatus(value){
const status = String(value || "active").trim().toLowerCase()
return status || "active"
}

function isGallerySharingStopped(status){
return normalizeGallerySharingStatus(status) === "stopped"
}

function buildGallerySharingActionLabel(status){
return isGallerySharingStopped(status) ? "Resume Gallery Sharing" : "Stop Gallery Sharing"
}

// =============================
// SUBSCRIPTION GATE FOR PUBLIC GALLERY ACCESS
// =============================

const PUBLIC_GALLERY_PLAN_CACHE_TTL_MS = 60000
const publicGalleryPlanCache = new Map()
const PUBLIC_GALLERY_FREE_SHARE_LIMIT = 1
const PUBLIC_GALLERY_ALLOWED_FEATURES_FOR_FREE = new Set(["sharing", "face_search"])
const EVENT_PHOTO_PRICE_CACHE = new Map()
const GALLERY_MIN_PHOTO_SELLING_PRICE = 49
const GALLERY_TRACK_USAGE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/track-usage"
const STUDIOOS_PRODUCTION_PUBLIC_WEB_BASE_URL = "https://adimasram333-tech.github.io/studioos"

// =============================
// PUBLIC WEB URL HELPERS (ANDROID-SAFE)
// =============================
//
// Public client/guest links must never use Capacitor/local app origin.
// In Android builds, set window.STUDIOOS_PUBLIC_WEB_APP_BASE_URL from a central config
// before gallery.js loads, for example: https://your-domain/studioos
// Web fallback preserves the current browser behavior.

function isStudioOSLocalOrPrivateHost(hostname){
const host = String(hostname || "").trim().toLowerCase()

return (
host === "localhost" ||
host === "127.0.0.1" ||
host === "0.0.0.0" ||
host === "::1" ||
host.endsWith(".localhost") ||
host.startsWith("192.168.") ||
host.startsWith("10.") ||
/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
)
}

function normalizeStudioOSBaseUrl(value){
const raw = String(value || "").trim().replace(/\/+$/, "")
if(!raw) return ""
if(!/^https:\/\//i.test(raw)) return ""

try{
const parsed = new URL(raw)

if(isStudioOSLocalOrPrivateHost(parsed.hostname)){
return ""
}

return parsed.href.replace(/\/+$/, "")
}catch(e){
return ""
}
}

function isAppLocalOrigin(){
try{
const protocol = String(window.location.protocol || "").toLowerCase()
const origin = String(window.location.origin || "").toLowerCase()
return (
protocol === "capacitor:" ||
protocol === "ionic:" ||
protocol === "file:" ||
origin.startsWith("capacitor://") ||
origin.startsWith("ionic://")
)
}catch(e){
return false
}
}

function resolveStudioOSWebBaseFromCurrentPage(){
try{
const origin = String(window.location.origin || "").replace(/\/+$/, "")
if(!origin || !/^https:\/\//i.test(origin) || isAppLocalOrigin()){
return ""
}

const parsedOrigin = new URL(origin)
if(isStudioOSLocalOrPrivateHost(parsedOrigin.hostname)){
return ""
}

const parts = String(window.location.pathname || "")
.split("/")
.filter(Boolean)

const studioIndex = parts.findIndex(part => String(part || "").toLowerCase() === "studioos")

if(studioIndex >= 0){
return normalizeStudioOSBaseUrl(`${origin}/${parts.slice(0, studioIndex + 1).join("/")}`)
}

return normalizeStudioOSBaseUrl(origin)
}catch(e){
return ""
}
}

function getStudioOSPublicWebBaseUrl(){
const productionBase = normalizeStudioOSBaseUrl(STUDIOOS_PRODUCTION_PUBLIC_WEB_BASE_URL) || "https://adimasram333-tech.github.io/studioos"

if(isAppLocalOrigin()){
return productionBase
}

const configured =
normalizeStudioOSBaseUrl(window.STUDIOOS_PUBLIC_WEB_APP_BASE_URL) ||
normalizeStudioOSBaseUrl(window.PUBLIC_WEB_APP_BASE_URL) ||
normalizeStudioOSBaseUrl(window.STUDIOOS_WEB_BASE_URL)

if(configured){
return configured
}

const currentPageBase = resolveStudioOSWebBaseFromCurrentPage()

if(currentPageBase){
return currentPageBase
}

return productionBase
}

function buildStudioOSPublicPageUrl(pageName, params = {}){
const baseUrl = getStudioOSPublicWebBaseUrl()
const safePage = String(pageName || "").replace(/^\/+/, "").trim()

if(!baseUrl || !safePage){
return ""
}

const query = new URLSearchParams()

Object.entries(params || {}).forEach(([key, value])=>{
if(value === undefined || value === null || value === ""){
return
}
query.set(String(key), String(value))
})

const queryString = query.toString()
return `${baseUrl}/${safePage}${queryString ? `?${queryString}` : ""}`
}

function requireStudioOSPublicPageUrl(pageName, params = {}){
const url = buildStudioOSPublicPageUrl(pageName, params)

if(url){
return url
}

alert("Public web URL is not configured. Please open this feature from StudioOS Web or configure STUDIOOS_PUBLIC_WEB_APP_BASE_URL for Android.")
throw new Error("StudioOS public web URL is not configured.")
}


function normalizePlanValue(value){
return String(value || "").trim().toLowerCase()
}

function isActivePaidPublicGalleryPlan(settings){
if(!settings) return false

const plan = normalizePlanValue(settings.plan)
const status = normalizePlanValue(settings.subscription_status)
const isPaid = settings.is_paid === true
const expiresAt = settings.plan_expires_at ? new Date(settings.plan_expires_at).getTime() : 0
const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now()

return isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro")
}


function isFreeOrTrialPublicGalleryPlan(settings){
if(!settings) return true

const plan = normalizePlanValue(settings.plan)
const status = normalizePlanValue(settings.subscription_status)
const isPaid = settings.is_paid === true
const expiresAt = settings.plan_expires_at ? new Date(settings.plan_expires_at).getTime() : 0
const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now()

if(isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro")){
return false
}

return true
}

function generatePublicShareToken(){
return Math.random().toString(36).substring(2,8).toUpperCase()
}

async function getExistingPublicShareToken(eventId){
const safeEventId = String(eventId || "").trim()
if(!safeEventId) return null

try{
const supabase = await window.getSupabase()
if(!supabase) return null

const { data, error } = await supabase
.from("event_tokens")
.select("token")
.eq("event_id", safeEventId)
.order("created_at", { ascending: true })
.limit(1)
.maybeSingle()

if(error){
console.error("Public share token lookup failed:", error)
return null
}

return data?.token || null
}catch(err){
console.error("Public share token lookup error:", err)
return null
}
}

async function countOwnerPublicSharedEvents(ownerId){
const safeOwnerId = String(ownerId || "").trim()
if(!safeOwnerId) return 0

try{
const supabase = await window.getSupabase()
if(!supabase) return PUBLIC_GALLERY_FREE_SHARE_LIMIT

const { count, error } = await supabase
.from("feature_usage_limits")
.select("event_id", { count: "exact", head: true })
.eq("user_id", safeOwnerId)
.eq("feature_key", "gallery_sharing")

if(error){
console.error("Free public share usage count failed:", error)
return PUBLIC_GALLERY_FREE_SHARE_LIMIT
}

return Math.max(0, Number(count || 0))
}catch(err){
console.error("Free public share usage count error:", err)
return PUBLIC_GALLERY_FREE_SHARE_LIMIT
}
}

async function claimPublicGalleryShareUsage(eventId){
const safeEventId = String(eventId || "").trim()
if(!safeEventId){
return { allowed:false, reason:"invalid_event" }
}

try{
const supabase = await window.getSupabase()
if(!supabase){
return { allowed:false, reason:"supabase_missing" }
}

const { data, error } = await supabase.rpc("claim_feature_usage_limit", {
p_feature_key: "gallery_sharing",
p_event_id: safeEventId
})

if(error){
console.error("Public gallery share usage claim failed:", error)
return { allowed:false, reason:"claim_failed" }
}

if(!data?.allowed){
return {
allowed:false,
reason:data?.reason || "free_limit_reached"
}
}

return {
allowed:true,
reason:data?.reason || "allowed"
}
}catch(err){
console.error("Public gallery share usage claim error:", err)
return { allowed:false, reason:"claim_error" }
}
}

async function ensurePublicShareToken(eventId){
const safeEventId = String(eventId || "").trim()
if(!safeEventId) return null

try{
const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
return null
}

const { data: ev, error: eventError } = await supabase
.from("events")
.select("id,user_id")
.eq("id", safeEventId)
.eq("user_id", user.id)
.maybeSingle()

if(eventError || !ev){
console.error("Public share token event validation failed:", eventError)
return null
}

const claimResult = await claimPublicGalleryShareUsage(safeEventId)
if(!claimResult.allowed){
console.error("Public gallery share limit blocked:", claimResult.reason)
return null
}

const existingToken = await getExistingPublicShareToken(safeEventId)
if(existingToken) return existingToken

const newToken = generatePublicShareToken()
const { data: inserted, error: insertError } = await supabase
.from("event_tokens")
.insert([{ event_id: safeEventId, token: newToken }])
.select("token")
.limit(1)
.maybeSingle()

if(insertError){
const retryToken = await getExistingPublicShareToken(safeEventId)
if(retryToken) return retryToken
console.error("Public share token create failed:", insertError)
return null
}

return inserted?.token || newToken
}catch(err){
console.error("Public share token create error:", err)
return null
}
}


async function regeneratePublicShareToken(eventId){
const safeEventId = String(eventId || "").trim()
if(!safeEventId) return null

try{
const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
return null
}

const { data: ev, error: eventError } = await supabase
.from("events")
.select("id,user_id")
.eq("id", safeEventId)
.eq("user_id", user.id)
.maybeSingle()

if(eventError || !ev){
console.error("Token regenerate event ownership validation failed:", eventError)
return null
}

const newToken = generatePublicShareToken()

const resetPayload = {
token: newToken,
used: false,
used_by: null,
device_id: null,
device_id_2: null
}

const { data: existingTokenRow, error: existingError } = await supabase
.from("event_tokens")
.select("id")
.eq("event_id", safeEventId)
.order("created_at", { ascending: true })
.limit(1)
.maybeSingle()

if(existingError){
console.error("Token regenerate lookup failed:", existingError)
return null
}

if(existingTokenRow?.id){
const { data: updated, error: updateError } = await supabase
.from("event_tokens")
.update(resetPayload)
.eq("id", existingTokenRow.id)
.select("token")
.limit(1)
.maybeSingle()

if(updateError){
console.error("Token regenerate update failed:", updateError)
return null
}

return updated?.token || newToken
}

const { data: inserted, error: insertError } = await supabase
.from("event_tokens")
.insert([{ event_id: safeEventId, ...resetPayload }])
.select("token")
.limit(1)
.maybeSingle()

if(insertError){
console.error("Token regenerate insert failed:", insertError)
return null
}

return inserted?.token || newToken
}catch(err){
console.error("Token regenerate error:", err)
return null
}
}

window.regeneratePublicShareToken = regeneratePublicShareToken

async function canUseFreeLimitedGalleryFeature(eventId, ownerId){
const safeEventId = String(eventId || "").trim()
const safeOwnerId = String(ownerId || "").trim()

if(!safeEventId || !safeOwnerId){
return false
}

try{
const supabase = await window.getSupabase()
if(!supabase) return false

const { data: existingUsage, error: existingUsageError } = await supabase
.from("feature_usage_limits")
.select("id")
.eq("user_id", safeOwnerId)
.eq("event_id", safeEventId)
.eq("feature_key", "gallery_sharing")
.limit(1)
.maybeSingle()

if(existingUsageError){
console.error("Free public share existing usage check failed:", existingUsageError)
return false
}

if(existingUsage?.id){
return true
}

const usedCount = await countOwnerPublicSharedEvents(safeOwnerId)
return usedCount < PUBLIC_GALLERY_FREE_SHARE_LIMIT
}catch(err){
console.error("Free public share limit check error:", err)
return false
}
}

window.ensurePublicShareToken = ensurePublicShareToken

function closeFloatingMenu(){
const existingMenu = document.getElementById("floatingMenu")
if(existingMenu){
existingMenu.remove()
}
activeMenu = null
}


function escapeStudioOSHtml(value){
return String(value ?? "")
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;")
}

function showStudioOSToast(message, type = "success"){
const existingToast = document.getElementById("studioosGalleryToast")
if(existingToast){
existingToast.remove()
}

const toast = document.createElement("div")
toast.id = "studioosGalleryToast"
toast.style.position = "fixed"
toast.style.left = "50%"
toast.style.bottom = "calc(86px + env(safe-area-inset-bottom, 0px))"
toast.style.transform = "translateX(-50%)"
toast.style.width = "min(calc(100% - 32px), 360px)"
toast.style.zIndex = "2147482500"
toast.style.padding = "0.85rem 1rem"
toast.style.borderRadius = "1rem"
toast.style.background = type === "error" ? "rgba(127,29,29,0.96)" : "rgba(15,23,42,0.96)"
toast.style.border = type === "error" ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(255,255,255,0.12)"
toast.style.boxShadow = "0 18px 55px rgba(0,0,0,0.38)"
toast.style.backdropFilter = "blur(16px)"
toast.style.color = "#ffffff"
toast.style.fontSize = "0.9rem"
toast.style.fontWeight = "700"
toast.style.textAlign = "center"
toast.style.pointerEvents = "none"
toast.textContent = message

document.body.appendChild(toast)

setTimeout(()=>{
toast.style.transition = "opacity 180ms ease, transform 180ms ease"
toast.style.opacity = "0"
toast.style.transform = "translateX(-50%) translateY(8px)"
setTimeout(()=>{
toast.remove()
}, 220)
}, 1850)
}

function showStudioOSInfo(message, title = "StudioOS"){
return new Promise(resolve=>{
const existingModal = document.getElementById("studioosGalleryInfoModal")
if(existingModal){
existingModal.remove()
}

const modal = document.createElement("div")
modal.id = "studioosGalleryInfoModal"
modal.style.position = "fixed"
modal.style.inset = "0"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.padding = "1rem"
modal.style.background = "rgba(2,6,23,0.72)"
modal.style.backdropFilter = "blur(10px)"
modal.style.zIndex = "2147482400"

modal.innerHTML = `
<div style="
  width:min(100%, 360px);
  border-radius:1.35rem;
  padding:1.15rem;
  background:rgba(15,23,42,0.97);
  border:1px solid rgba(255,255,255,0.1);
  box-shadow:0 24px 70px rgba(0,0,0,0.4);
  color:white;
">
  <div style="
    display:inline-flex;
    align-items:center;
    min-height:30px;
    padding:0 0.78rem;
    border-radius:999px;
    background:rgba(99,102,241,0.16);
    border:1px solid rgba(99,102,241,0.32);
    color:rgb(199 210 254);
    font-size:0.72rem;
    font-weight:850;
    letter-spacing:0.08em;
    text-transform:uppercase;
  ">${escapeStudioOSHtml(title)}</div>

  <div style="
    margin-top:0.95rem;
    color:rgba(255,255,255,0.84);
    font-size:0.96rem;
    line-height:1.55;
    white-space:pre-line;
  ">${escapeStudioOSHtml(message)}</div>

  <button id="studioosGalleryInfoOkBtn" type="button" style="
    margin-top:1rem;
    width:100%;
    min-height:46px;
    border-radius:0.95rem;
    background:rgb(79 70 229);
    color:white;
    border:1px solid transparent;
    font-size:0.9rem;
    font-weight:850;
    cursor:pointer;
    box-shadow:0 14px 30px rgba(79,70,229,0.25);
  ">OK</button>
</div>
`

document.body.appendChild(modal)

const closeModal = ()=>{
modal.remove()
resolve(true)
}

modal.addEventListener("click", event=>{
if(event.target === modal){
closeModal()
}
})

const okBtn = document.getElementById("studioosGalleryInfoOkBtn")
if(okBtn){
okBtn.onclick = closeModal
}
})
}

function showStudioOSConfirm(options = {}){
return new Promise(resolve=>{
const existingModal = document.getElementById("studioosGalleryConfirmModal")
if(existingModal){
existingModal.remove()
}

const title = options.title || "Confirm"
const message = options.message || ""
const confirmText = options.confirmText || "Confirm"
const cancelText = options.cancelText || "Cancel"
const danger = options.danger === true

const modal = document.createElement("div")
modal.id = "studioosGalleryConfirmModal"
modal.style.position = "fixed"
modal.style.inset = "0"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.padding = "1rem"
modal.style.background = "rgba(2,6,23,0.72)"
modal.style.backdropFilter = "blur(10px)"
modal.style.zIndex = "2147482400"

modal.innerHTML = `
<div style="
  width:min(100%, 390px);
  border-radius:1.35rem;
  padding:1.15rem;
  background:rgba(15,23,42,0.97);
  border:1px solid rgba(255,255,255,0.1);
  box-shadow:0 24px 70px rgba(0,0,0,0.4);
  color:white;
">
  <div style="
    display:inline-flex;
    align-items:center;
    min-height:30px;
    padding:0 0.78rem;
    border-radius:999px;
    background:${danger ? "rgba(239,68,68,0.16)" : "rgba(99,102,241,0.16)"};
    border:1px solid ${danger ? "rgba(248,113,113,0.32)" : "rgba(99,102,241,0.32)"};
    color:${danger ? "rgb(254 202 202)" : "rgb(199 210 254)"};
    font-size:0.72rem;
    font-weight:850;
    letter-spacing:0.08em;
    text-transform:uppercase;
  ">${danger ? "Important" : "StudioOS"}</div>

  <div style="
    margin-top:0.9rem;
    font-size:1.15rem;
    line-height:1.25;
    font-weight:900;
  ">${escapeStudioOSHtml(title)}</div>

  <div style="
    margin-top:0.65rem;
    color:rgba(255,255,255,0.78);
    font-size:0.92rem;
    line-height:1.58;
    white-space:pre-line;
  ">${escapeStudioOSHtml(message)}</div>

  <div style="display:flex; gap:0.75rem; margin-top:1.05rem;">
    <button id="studioosGalleryConfirmCancelBtn" type="button" style="
      flex:1;
      min-height:46px;
      border-radius:0.95rem;
      background:rgba(255,255,255,0.06);
      color:white;
      border:1px solid rgba(255,255,255,0.1);
      font-size:0.88rem;
      font-weight:800;
      cursor:pointer;
    ">${escapeStudioOSHtml(cancelText)}</button>

    <button id="studioosGalleryConfirmOkBtn" type="button" style="
      flex:1;
      min-height:46px;
      border-radius:0.95rem;
      background:${danger ? "rgb(220 38 38)" : "rgb(79 70 229)"};
      color:white;
      border:1px solid transparent;
      font-size:0.88rem;
      font-weight:850;
      cursor:pointer;
      box-shadow:0 14px 30px ${danger ? "rgba(220,38,38,0.22)" : "rgba(79,70,229,0.25)"};
    ">${escapeStudioOSHtml(confirmText)}</button>
  </div>
</div>
`

document.body.appendChild(modal)

const closeModal = value=>{
modal.remove()
resolve(value)
}

modal.addEventListener("click", event=>{
if(event.target === modal){
closeModal(false)
}
})

const cancelBtn = document.getElementById("studioosGalleryConfirmCancelBtn")
const okBtn = document.getElementById("studioosGalleryConfirmOkBtn")

if(cancelBtn){
cancelBtn.onclick = ()=> closeModal(false)
}

if(okBtn){
okBtn.onclick = ()=> closeModal(true)
}
})
}

function isCapacitorNativeApp(){
try{
const cap = window.Capacitor
const protocol = String(window.location.protocol || "").toLowerCase()

if(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()){
return true
}

if(protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:"){
return true
}

const plugins = cap?.Plugins || {}
return !!(plugins.Filesystem || plugins.Share)

}catch(error){
return false
}
}

function getCapacitorPlugins(){
try{
return window.Capacitor?.Plugins || {}
}catch(error){
return {}
}
}

function blobToBase64(blob){
return new Promise((resolve,reject)=>{
const reader = new FileReader()

reader.onloadend = function(){
try{
const result = String(reader.result || "")
const base64 = result.includes(",") ? result.split(",")[1] : result
if(!base64){
reject(new Error("Base64 conversion failed"))
return
}
resolve(base64)
}catch(error){
reject(error)
}
}

reader.onerror = function(){
reject(new Error("Blob read failed"))
}

reader.readAsDataURL(blob)
})
}

async function saveBlobWithCapacitor(blob, fileName, shareTitle = "StudioOS File"){
const saver = getStudioOSFileSaverPlugin()

if(!saver || typeof saver.saveFile !== "function"){
throw new Error("StudioOS native file saver is not available")
}

const safeFileName =
String(fileName || "studioos-file")
.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
.replace(/\s+/g, "_")
.trim() || "studioos-file"

const base64Data = await blobToBase64(blob)
const mimeType = blob?.type || guessMimeTypeFromFileName(safeFileName)

await saver.saveFile({
base64Data,
fileName: safeFileName,
mimeType,
target: mimeType.startsWith("image/") ? "images" : "downloads"
})

return true
}

function getStudioOSFileSaverPlugin(){
try{
return window.Capacitor?.Plugins?.StudioOSFileSaver || null
}catch(error){
return null
}
}

function guessMimeTypeFromFileName(fileName){
const value = String(fileName || "").toLowerCase()

if(value.endsWith(".png")) return "image/png"
if(value.endsWith(".webp")) return "image/webp"
if(value.endsWith(".gif")) return "image/gif"
if(value.endsWith(".pdf")) return "application/pdf"
if(value.endsWith(".jpg") || value.endsWith(".jpeg")) return "image/jpeg"

return "application/octet-stream"
}

async function saveStudioOSBlob(blob, filename){
if(isCapacitorNativeApp()){
return await saveBlobWithCapacitor(blob, filename, "StudioOS File")
}

triggerBlobDownload(blob, filename)
return true
}

async function copyTextToClipboard(text){
const value = String(text || "")

try{
if(navigator.clipboard && typeof navigator.clipboard.writeText === "function"){
await navigator.clipboard.writeText(value)
return true
}
}catch(error){
console.warn("Navigator clipboard failed:", error)
}

try{
const input = document.createElement("textarea")
input.value = value
input.setAttribute("readonly", "")
input.style.position = "fixed"
input.style.left = "-9999px"
document.body.appendChild(input)
input.select()
document.execCommand("copy")
input.remove()
return true
}catch(error){
console.error("Clipboard fallback failed:", error)
return false
}
}


function showPublicGalleryUpgradeMessage(message = "Free plan includes limited Gallery Sharing and limited AI Face Search for 1 event. Upgrade to Basic or Pro for full access."){

const existingModal = document.getElementById("galleryUpgradeModal")
if(existingModal){
existingModal.remove()
}

const modal = document.createElement("div")
modal.id = "galleryUpgradeModal"
modal.style.position = "fixed"
modal.style.inset = "0"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.padding = "1rem"
modal.style.background = "rgba(2,6,23,0.72)"
modal.style.backdropFilter = "blur(10px)"
modal.style.zIndex = "1200"

modal.innerHTML = `
<div style="
  width:min(100%, 390px);
  border-radius:1.35rem;
  padding:1.15rem;
  background:rgba(15,23,42,0.96);
  border:1px solid rgba(255,255,255,0.1);
  box-shadow:0 24px 70px rgba(0,0,0,0.38);
  color:white;
">
  <div style="
    display:inline-flex;
    align-items:center;
    min-height:30px;
    padding:0 0.78rem;
    border-radius:999px;
    background:rgba(99,102,241,0.16);
    border:1px solid rgba(99,102,241,0.32);
    color:rgb(199 210 254);
    font-size:0.72rem;
    font-weight:800;
    letter-spacing:0.08em;
    text-transform:uppercase;
  ">Upgrade Required</div>

  <div style="
    margin-top:0.9rem;
    font-size:1.15rem;
    line-height:1.25;
    font-weight:850;
  ">Unlock full gallery access</div>

  <div style="
    margin-top:0.6rem;
    color:rgba(255,255,255,0.78);
    font-size:0.9rem;
    line-height:1.6;
  ">${String(message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

  <div style="
    margin-top:0.85rem;
    padding:0.85rem;
    border-radius:1rem;
    background:rgba(99,102,241,0.12);
    border:1px solid rgba(99,102,241,0.22);
    color:rgba(255,255,255,0.78);
    font-size:0.82rem;
    line-height:1.5;
  ">Basic and Pro unlock full Gallery Sharing, QR, Tokens, AI Face Search, and premium workflow tools.</div>

  <div style="display:flex; gap:0.75rem; margin-top:1rem;">
    <button id="galleryUpgradeCloseBtn" type="button" style="
      flex:1;
      min-height:46px;
      border-radius:0.95rem;
      background:rgba(255,255,255,0.06);
      color:white;
      border:1px solid rgba(255,255,255,0.1);
      font-size:0.88rem;
      font-weight:750;
      cursor:pointer;
    ">Close</button>

    <button id="galleryUpgradeOpenBtn" type="button" style="
      flex:1;
      min-height:46px;
      border-radius:0.95rem;
      background:rgb(79 70 229);
      color:white;
      border:1px solid transparent;
      font-size:0.88rem;
      font-weight:800;
      cursor:pointer;
      box-shadow:0 14px 30px rgba(79,70,229,0.25);
    ">Upgrade</button>
  </div>
</div>
`

document.body.appendChild(modal)

const closeModal = ()=>{
modal.remove()
}

modal.addEventListener("click", (event)=>{
if(event.target === modal){
closeModal()
}
})

const closeBtn = document.getElementById("galleryUpgradeCloseBtn")
const openBtn = document.getElementById("galleryUpgradeOpenBtn")

if(closeBtn){
closeBtn.onclick = closeModal
}

if(openBtn){
openBtn.onclick = ()=>{
window.location.href = "subscription.html"
}
}
}

async function getEventOwnerIdForGate(eventId){
const safeEventId = String(eventId || "").trim()
if(!safeEventId) return ""

try{
const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
return ""
}

const { data, error } = await supabase
.from("events")
.select("id,user_id")
.eq("id", safeEventId)
.eq("user_id", user.id)
.maybeSingle()

if(error){
console.error("Public gallery event ownership check failed:", error)
return ""
}

return data?.user_id || ""
}catch(err){
console.error("Public gallery event ownership check error:", err)
return ""
}
}

async function canUsePublicGalleryFeatures(eventId, feature = "sharing"){
const safeFeature = String(feature || "sharing").trim().toLowerCase()
const ownerId = await getEventOwnerIdForGate(eventId)

if(!ownerId){
return false
}

const cached = publicGalleryPlanCache.get(ownerId)
let settings = null

if(cached && cached.expiresAt > Date.now()){
settings = cached.settings || null
}else{
try{
const supabase = await window.getSupabase()

if(!supabase){
return false
}

const { data, error } = await supabase
.from("photographer_settings")
.select("plan, subscription_status, is_paid, plan_expires_at")
.eq("user_id", ownerId)
.maybeSingle()

if(error){
console.error("Public gallery plan check failed:", error)
return false
}

settings = data || null

publicGalleryPlanCache.set(ownerId, {
settings,
expiresAt: Date.now() + PUBLIC_GALLERY_PLAN_CACHE_TTL_MS
})
}catch(err){
console.error("Public gallery plan check error:", err)
return false
}
}

if(isActivePaidPublicGalleryPlan(settings)){
return true
}

if(!PUBLIC_GALLERY_ALLOWED_FEATURES_FOR_FREE.has(safeFeature)){
return false
}

if(!isFreeOrTrialPublicGalleryPlan(settings)){
return false
}

return await canUseFreeLimitedGalleryFeature(eventId, ownerId)
}

async function guardPublicGalleryFeature(eventId, feature = "sharing"){
const safeFeature = String(feature || "sharing").trim().toLowerCase()
const allowed = await canUsePublicGalleryFeatures(eventId, safeFeature)

if(!allowed){
closeFloatingMenu()

if(PUBLIC_GALLERY_ALLOWED_FEATURES_FOR_FREE.has(safeFeature)){
showPublicGalleryUpgradeMessage("Free plan allows this feature for only 1 event. Upgrade to Basic or Pro for full access.")
}else{
showPublicGalleryUpgradeMessage("This feature is available only on Basic and Pro plans.")
}

return false
}

return true
}

function normalizePhotoSellingPrice(value){
const amount = Number(value)
if(!Number.isFinite(amount)) return GALLERY_MIN_PHOTO_SELLING_PRICE
return Math.max(GALLERY_MIN_PHOTO_SELLING_PRICE, Math.floor(amount))
}

function setEventPhotoPriceCache(eventId, price){
const safeEventId = String(eventId || "").trim()
if(!safeEventId) return
EVENT_PHOTO_PRICE_CACHE.set(safeEventId, normalizePhotoSellingPrice(price))
}

function getSafePhotoSellingPriceFromMenu(eventId){
const safeEventId = String(eventId || "").trim()
if(!safeEventId) return GALLERY_MIN_PHOTO_SELLING_PRICE
return normalizePhotoSellingPrice(EVENT_PHOTO_PRICE_CACHE.get(safeEventId))
}

function showPhotoPriceModal(eventId, currentPrice){
let existingModal = document.getElementById("photoPriceModal")
if(existingModal){
existingModal.remove()
}

const safePrice = normalizePhotoSellingPrice(currentPrice)
const modal = document.createElement("div")
modal.id = "photoPriceModal"
modal.style.position = "fixed"
modal.style.inset = "0"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.padding = "1rem"
modal.style.background = "rgba(2,6,23,0.7)"
modal.style.backdropFilter = "blur(8px)"
modal.style.zIndex = "1200"

modal.innerHTML = `
<div style="
  width:min(100%, 360px);
  border-radius:1.25rem;
  padding:1.15rem;
  background:rgba(15,23,42,0.96);
  border:1px solid rgba(255,255,255,0.08);
  box-shadow:0 24px 60px rgba(0,0,0,0.35);
  color:white;
">
  <div style="
    display:inline-flex;
    align-items:center;
    padding:0.38rem 0.65rem;
    border-radius:999px;
    font-size:0.7rem;
    font-weight:700;
    letter-spacing:0.06em;
    text-transform:uppercase;
    background:rgba(99,102,241,0.12);
    border:1px solid rgba(99,102,241,0.24);
    color:rgb(199 210 254);
  ">Photo Price</div>

  <div style="font-size:1.2rem; font-weight:800; margin-top:0.9rem;">Set download price</div>

  <div style="margin-top:1rem;">
    <label style="display:block; font-size:0.78rem; color:rgba(255,255,255,0.62); margin-bottom:0.45rem;">Minimum ₹49</label>
    <div style="
      display:flex;
      align-items:center;
      gap:0.55rem;
      padding:0.85rem 0.9rem;
      border-radius:0.95rem;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.08);
    ">
      <span style="font-size:1rem; font-weight:800;">₹</span>
      <input id="photoPriceInput" type="number" min="49" step="1" value="${safePrice}" style="
        width:100%;
        background:transparent;
        border:none;
        outline:none;
        color:white;
        font-size:1.2rem;
        font-weight:800;
      ">
    </div>
    <div id="photoPriceFeedback" style="display:none; margin-top:0.7rem; color:rgb(254 202 202); font-size:0.82rem;"></div>
  </div>

  <div style="display:flex; gap:0.75rem; margin-top:1rem;">
    <button id="photoPriceCancelBtn" type="button" style="
      flex:1;
      padding:0.85rem 1rem;
      border-radius:0.9rem;
      font-size:0.86rem;
      font-weight:700;
      background:rgba(255,255,255,0.06);
      color:white;
      border:1px solid rgba(255,255,255,0.08);
      cursor:pointer;
    ">Cancel</button>

    <button id="photoPriceSaveBtn" type="button" style="
      flex:1;
      padding:0.85rem 1rem;
      border-radius:0.9rem;
      font-size:0.86rem;
      font-weight:700;
      background:rgb(79 70 229);
      color:white;
      border:1px solid transparent;
      cursor:pointer;
    ">Save</button>
  </div>
</div>
`

document.body.appendChild(modal)
document.body.style.overflow = "hidden"

const closeModal = ()=>{
modal.remove()
document.body.style.overflow = ""
}

modal.addEventListener("click", (event)=>{
if(event.target === modal){
closeModal()
}
})

document.getElementById("photoPriceCancelBtn").onclick = closeModal

document.getElementById("photoPriceSaveBtn").onclick = async ()=>{
const input = document.getElementById("photoPriceInput")
const feedback = document.getElementById("photoPriceFeedback")
const nextPrice = Number(input?.value || 0)

if(!Number.isFinite(nextPrice) || nextPrice < GALLERY_MIN_PHOTO_SELLING_PRICE){
if(feedback){
feedback.innerText = "Minimum price is ₹49"
feedback.style.display = "block"
}
return
}

try{
const saveBtn = document.getElementById("photoPriceSaveBtn")
saveBtn.disabled = true
saveBtn.innerText = "Saving..."

const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
alert("Please login again")
return
}

const safeEventId = String(eventId || "").trim()
const cleanPrice = normalizePhotoSellingPrice(nextPrice)

const { error } = await supabase
.from("events")
.update({ photo_selling_price: cleanPrice })
.eq("id", safeEventId)
.eq("user_id", user.id)

if(error){
console.error("Photo price update failed:", error)
if(feedback){
feedback.innerText = "Failed to save price"
feedback.style.display = "block"
}
saveBtn.disabled = false
saveBtn.innerText = "Save"
return
}

setEventPhotoPriceCache(safeEventId, cleanPrice)
closeModal()
location.reload()
}catch(err){
console.error("Photo price save failed:", err)
alert("Failed to save price")
}
}
}

window.openPhotoPriceModal = async function(eventId){
const allowed = await guardPublicGalleryFeature(eventId, "paid")
if(!allowed) return

closeFloatingMenu()
showPhotoPriceModal(eventId, getSafePhotoSellingPriceFromMenu(eventId))
}

function buildMenuHtml(id, guestFreeDownload, galleryStatus = "active"){
const safeMode = guestFreeDownload ? "true" : "false"
const safeStatus = normalizeGallerySharingStatus(galleryStatus)
const sharingActionClass = isGallerySharingStopped(safeStatus)
? "px-3 py-2 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
: "px-3 py-2 hover:bg-amber-500/20 text-amber-300 cursor-pointer"

return `
<div onclick="openEvent('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Open</div>
<div onclick="shareEvent('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Share Link</div>
<div onclick="showQR('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Show QR</div>
<div onclick="showToken('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Show Token</div>
<div onclick="regenerateToken('${id}')" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Regenerate Token</div>
<div onclick="toggleGallerySharingStatus('${id}', '${safeStatus}')" class="${sharingActionClass}">${buildGallerySharingActionLabel(safeStatus)}</div>
<div onclick="openPhotoPriceModal('${id}', this)" class="px-3 py-2 hover:bg-white/10 cursor-pointer">Price ₹${getSafePhotoSellingPriceFromMenu(id)}</div>
<div onclick="toggleGuestFreeDownload('${id}', ${safeMode})" class="px-3 py-2 hover:bg-white/10 cursor-pointer">
${buildGuestDownloadLabel(guestFreeDownload)}
</div>
<div onclick="deleteEvent('${id}')" class="px-3 py-2 hover:bg-red-500/20 text-red-400 cursor-pointer">Delete Gallery</div>
`
}

function removeEventCardFromDom(id){
const safeId = String(id || "").trim()
if(!safeId) return false

const card = document.querySelector(`[data-gallery-event-id="${CSS.escape(safeId)}"]`)
if(card){
card.remove()
}

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

if(grid && grid.children.length === 0 && empty){
empty.innerText = "No events found"
empty.classList.remove("hidden")
}

return !!card
}

function clearDeletedEventSession(id){
const safeId = String(id || "").trim()
if(!safeId) return

const storedEventId = sessionStorage.getItem("event_id")
if(storedEventId && String(storedEventId) === safeId){
sessionStorage.removeItem("event_id")
}

const eventScopedKeys = [
"gallery_access",
"visitor_id",
"face_encoding",
"matched_images",
"matched_image_urls",
"face_matched_images",
"face_match_images",
"guest_matched_images",
"matched_images_by_event",
"matched_image_urls_by_event",
"face_matched_images_by_event",
"face_scan_done",
"face_scan_event_id",
"face_verified"
]

eventScopedKeys.forEach(key=>{
try{
sessionStorage.removeItem(key)
}catch(e){}
})
}

function positionFloatingMenu(menu, btn){

if(!menu || !btn) return

const rect = btn.getBoundingClientRect()
const viewportWidth = window.innerWidth
const viewportHeight = window.innerHeight
const safeMargin = 8

const menuWidth = menu.offsetWidth || 180
const menuHeight = menu.offsetHeight || 220

let left = rect.right - menuWidth
let top = rect.bottom + 6

if(left < safeMargin){
left = safeMargin
}

if(left + menuWidth > viewportWidth - safeMargin){
left = viewportWidth - menuWidth - safeMargin
}

if(top + menuHeight > viewportHeight - safeMargin){
top = rect.top - menuHeight - 6
}

if(top < safeMargin){
top = safeMargin
}

menu.style.left = `${Math.max(safeMargin, left)}px`
menu.style.top = `${Math.max(safeMargin, top)}px`
}

window.toggleMenu = function(id, btn, guestFreeDownload = false, galleryStatus = "active"){

const existing = document.getElementById("floatingMenu")

if(existing && existing.dataset.id === id){
existing.remove()
activeMenu = null
return
}

if(existing) existing.remove()

const menu = document.createElement("div")
menu.id = "floatingMenu"
menu.dataset.id = id
menu.dataset.guestFreeDownload = guestFreeDownload ? "true" : "false"
menu.dataset.galleryStatus = normalizeGallerySharingStatus(galleryStatus)

menu.style.position = "fixed"
menu.style.top = "0px"
menu.style.left = "0px"
menu.style.background = "#1a1f2e"
menu.style.border = "1px solid rgba(255,255,255,0.1)"
menu.style.borderRadius = "8px"
menu.style.fontSize = "12px"
menu.style.zIndex = 99999
menu.style.backdropFilter = "blur(10px)"
menu.style.overflow = "hidden"
menu.style.minWidth = "180px"
menu.style.maxWidth = "calc(100vw - 16px)"
menu.style.boxSizing = "border-box"

menu.innerHTML = buildMenuHtml(id, !!guestFreeDownload, galleryStatus)

document.body.appendChild(menu)
activeMenu = menu

requestAnimationFrame(()=>{
positionFloatingMenu(menu, btn)
})

}

document.addEventListener("click",(e)=>{

if(!e.target.closest("#floatingMenu") && !e.target.closest("button") && !e.target.closest(".guest-download-toggle")){
const existing = document.getElementById("floatingMenu")
if(existing) existing.remove()
activeMenu = null
}

})

window.addEventListener("resize", ()=>{
const existing = document.getElementById("floatingMenu")
if(existing){
existing.remove()
activeMenu = null
}
})

window.addEventListener("scroll", ()=>{
const existing = document.getElementById("floatingMenu")
if(existing){
existing.remove()
activeMenu = null
}
}, true)

window.openEvent = async function(id){

const safeId = String(id || "").trim()
if(!safeId){
alert("Invalid event")
return
}

try{
const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
alert("Please login again")
return
}

const { data: ev, error } = await supabase
.from("events")
.select("id,user_id")
.eq("id", safeId)
.eq("user_id", user.id)
.maybeSingle()

if(error){
console.error("Event validation failed:", error)
alert("Failed to open event")
return
}

if(!ev){
removeEventCardFromDom(safeId)
clearDeletedEventSession(safeId)
alert("This event was already deleted or no longer exists.")
return
}

window.location.href = `gallery.html?event_id=${safeId}`
}catch(err){
console.error("Open event failed:", err)
alert("Failed to open event")
}
}

window.shareEvent = async function(id){
const allowed = await guardPublicGalleryFeature(id, "sharing")
if(!allowed) return

const token = await ensurePublicShareToken(id)
if(!token){
await showStudioOSInfo("Unable to enable public sharing. Please try again.", "Sharing")
return
}

const link = requireStudioOSPublicPageUrl("access.html", { event_id: id })
const copied = await copyTextToClipboard(link)

if(copied){
showStudioOSToast("Link copied")
}else{
await showStudioOSInfo(link, "Copy gallery link")
}
}

// =============================
// TOKEN SYSTEM
// =============================

window.showToken = async function(id){

const allowed = await guardPublicGalleryFeature(id, "sharing")
if(!allowed) return

const token = await ensurePublicShareToken(id)

if(!token){
await showStudioOSInfo("Unable to generate token. Please try again.", "Token")
return
}

await showStudioOSInfo(token, "Gallery Token")

}


window.regenerateToken = async function(id){
const allowed = await guardPublicGalleryFeature(id, "sharing")
if(!allowed) return

const confirmed = await showStudioOSConfirm({
title: "Regenerate client token?",
message: "The old client token will stop working. Two-device access will reset for this event. Share the new token only with the trusted client.",
confirmText: "Regenerate",
cancelText: "Cancel",
danger: true
})

if(!confirmed) return

closeFloatingMenu()
showStudioOSToast("Regenerating token...")

const token = await regeneratePublicShareToken(id)

if(!token){
await showStudioOSInfo("Unable to regenerate token. Please try again.", "Gallery Token")
return
}

try{
await copyTextToClipboard(token)
showStudioOSToast("New token copied")
}catch(e){
console.warn("Regenerated token copy failed:", e)
}

if(typeof window.openStudioOSGalleryTokenModal === "function"){
await window.openStudioOSGalleryTokenModal(token, {
title: "New Gallery Token",
subtitle: "Old token has been replaced. Share this new token only with trusted clients.",
copyToast: "New token copied"
})
return
}

await showStudioOSInfo(token, "New Gallery Token")
}

// =============================
// GUEST FREE DOWNLOAD TOGGLE
// =============================

window.toggleGuestFreeDownload = async function(id, currentValue = false){

const allowed = await guardPublicGalleryFeature(id, "paid")
if(!allowed) return

const nextValue = !currentValue

const confirmed = await showStudioOSConfirm({
title: nextValue ? "Enable free guest downloads?" : "Disable free guest downloads?",
message: nextValue
? "Guests will be able to preview and download matched photos without payment."
: "Guests will need to pay before downloading matched photos.",
confirmText: nextValue ? "Enable" : "Disable",
cancelText: "Cancel"
})

if(!confirmed) return

const existingMenu = document.getElementById("floatingMenu")
if(existingMenu) existingMenu.remove()
activeMenu = null

try{

const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
await showStudioOSInfo("Please login again and try.", "Session expired")
return
}

const { error } = await supabase
.from("events")
.update({
guest_free_download: nextValue
})
.eq("id", String(id))
.eq("user_id", user.id)

if(error){
console.error("Guest download mode update failed:", error)
showStudioOSToast("Failed to update guest download mode", "error")
return
}

showStudioOSToast(nextValue ? "Guest free download enabled" : "Guest free download disabled")
setTimeout(()=>{
location.reload()
}, 650)

}catch(err){
console.error(err)
showStudioOSToast("Failed to update guest download mode", "error")
}

}

// =============================
// GALLERY SHARING STATUS
// =============================

window.toggleGallerySharingStatus = async function(id, currentStatus = "active"){

const safeEventId = String(id || "").trim()
if(!safeEventId){
showStudioOSToast("Invalid event", "error")
return
}

const isStopped = isGallerySharingStopped(currentStatus)
const nextStatus = isStopped ? "active" : "stopped"

const confirmed = await showStudioOSConfirm({
title: isStopped ? "Resume gallery sharing?" : "Stop gallery sharing?",
message: isStopped
? "Clients and guests will be able to access this gallery again using the existing link, QR, or valid token."
: "Clients and guests will no longer be able to open this gallery from link, QR, token, or saved session until you resume sharing. Photographer access will remain available.",
confirmText: isStopped ? "Resume" : "Stop Sharing",
cancelText: "Cancel",
danger: !isStopped
})

if(!confirmed) return

closeFloatingMenu()

try{

const supabase = await window.getSupabase()
const user = await window.getCurrentUser()

if(!supabase || !user){
await showStudioOSInfo("Please login again and try.", "Session expired")
return
}

const { data: updatedEvent, error } = await supabase
.from("events")
.update({ status: nextStatus })
.eq("id", safeEventId)
.eq("user_id", user.id)
.select("id,status")
.maybeSingle()

if(error || !updatedEvent){
console.error("Gallery sharing status update failed:", error)
showStudioOSToast("Failed to update gallery sharing", "error")
return
}

showStudioOSToast(nextStatus === "stopped" ? "Gallery sharing stopped" : "Gallery sharing resumed")

setTimeout(()=>{
location.reload()
}, 650)

}catch(err){
console.error("Gallery sharing status update error:", err)
showStudioOSToast("Failed to update gallery sharing", "error")
}

}

// =============================
// DELETE SYSTEM
// =============================

window.deleteEvent = async function(id){

const confirmDelete = await showStudioOSConfirm({
title: "Delete gallery permanently?",
message: "This will remove all event photos and related gallery data.",
confirmText: "Delete",
cancelText: "Cancel",
danger: true
})

if(!confirmDelete) return

const existingMenu = document.getElementById("floatingMenu")
if(existingMenu) existingMenu.remove()
activeMenu = null

try{

const supabase = await window.getSupabase()

if(!supabase){
showStudioOSToast("Supabase not initialized", "error")
return
}

const { data: { session } } = await supabase.auth.getSession()

if(!session){
await showStudioOSInfo("Please login again.", "Session expired")
return
}

const response = await fetch(
"https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/delete-gallery",
{
method: "POST",
headers: {
"Content-Type": "application/json",
"apikey": window.SUPABASE_ANON_KEY || "",
"Authorization": `Bearer ${session.access_token}`
},
body: JSON.stringify({ event_id: String(id) })
}
)

let result = null

try{
result = await response.json()
}catch(parseErr){
result = null
}

if(!response.ok || !result?.success){
console.error("Delete failed:", result)
showStudioOSToast(result?.error || "Delete failed", "error")
return
}

clearDeletedEventSession(id)
removeEventCardFromDom(id)

showStudioOSToast("Gallery deleted successfully")

const params = new URLSearchParams(window.location.search)
const activeEventId = params.get("event_id") || params.get("event") || ""

if(activeEventId && String(activeEventId) === String(id)){
setTimeout(()=>{
window.location.href = "gallery.html"
}, 650)
}

}catch(err){
console.error(err)
showStudioOSToast("Delete failed", "error")
}

}

// =============================
// QR
// =============================

window.showQR = async function(id){

const allowed = await guardPublicGalleryFeature(id, "sharing")
if(!allowed) return

const token = await ensurePublicShareToken(id)
if(!token){
alert("Unable to enable public sharing. Please try again.")
return
}

const existingMenu = document.getElementById("floatingMenu")
if(existingMenu) existingMenu.remove()

const link = requireStudioOSPublicPageUrl("access.html", { event_id: id })

let modal = document.createElement("div")

modal.style.position = "fixed"
modal.style.top = 0
modal.style.left = 0
modal.style.width = "100%"
modal.style.height = "100%"
modal.style.background = "rgba(0,0,0,0.9)"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.zIndex = 9999

modal.innerHTML = `
<div style="background:#111; padding:20px; border-radius:12px; text-align:center">
<canvas id="qrCanvas"></canvas>
<div style="margin-top:10px; font-size:12px; color:#aaa">Scan to access gallery</div>

<button id="downloadQR"
style="margin-top:12px; background:#4f46e5; color:white; padding:6px 12px; border-radius:8px; font-size:12px">
Download QR
</button>
</div>
`

modal.onclick = (e)=>{
if(e.target === modal){
modal.remove()
}
}

document.body.appendChild(modal)

const qr = new Image()
qr.crossOrigin = "anonymous"
qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`

qr.onload = function(){
const canvas = document.getElementById("qrCanvas")
const ctx = canvas.getContext("2d")
canvas.width = 200
canvas.height = 200
ctx.drawImage(qr,0,0)
}

document.getElementById("downloadQR").onclick = async function(){

const canvas = document.getElementById("qrCanvas")

if(!canvas){
showStudioOSToast("QR not ready yet", "error")
return
}

canvas.toBlob(async function(blob){

if(!blob){
showStudioOSToast("QR download failed", "error")
return
}

try{

const fileName = `event-qr-${String(id || "gallery").replace(/[^a-zA-Z0-9-_]/g, "")}.png`

await triggerBlobDownload(blob, fileName)
showStudioOSToast("QR downloaded")

}catch(error){
console.error("QR download failed:", error)

try{
await triggerBlobDownload(blob, "event-qr.png")
showStudioOSToast("QR downloaded")
}catch(fallbackError){
console.error("QR fallback download failed:", fallbackError)
showStudioOSToast("QR download failed", "error")
}
}

}, "image/png")

}

}

// =============================
// SAFE HELPERS
// =============================

function normalizeImageUrl(url){
if(!url) return ""
return String(url).split("?")[0].trim()
}

function getPhotoOriginalUrl(photo){
if(!photo) return ""

if(typeof window.getBestMediaUrl === "function"){
const best = window.getBestMediaUrl(photo, "original")
if(best) return normalizeImageUrl(best)
}

if(typeof window.buildMediaUrl === "function" && photo.object_key){
return normalizeImageUrl(window.buildMediaUrl(photo.object_key))
}

return ""
}

function getPhotoPreviewUrl(photo){
if(!photo) return ""

if(typeof window.getBestMediaUrl === "function"){
const preview = window.getBestMediaUrl(photo, "preview")
if(preview) return normalizeImageUrl(preview)
}

if(photo.preview_key && typeof window.buildMediaUrl === "function"){
return normalizeImageUrl(window.buildMediaUrl(photo.preview_key))
}

return getPhotoOriginalUrl(photo)
}

function getPhotoThumbnailUrl(photo){
if(!photo) return ""

if(typeof window.getBestMediaUrl === "function"){
const thumb = window.getBestMediaUrl(photo, "thumbnail")
if(thumb) return normalizeImageUrl(thumb)
}

if(photo.thumbnail_key && typeof window.buildMediaUrl === "function"){
return normalizeImageUrl(window.buildMediaUrl(photo.thumbnail_key))
}

return getPhotoPreviewUrl(photo)
}

function isMatchedImage(imgUrl, matchedImages){

if(!matchedImages || matchedImages.size === 0) return false

const cleanUrl = normalizeImageUrl(imgUrl)
const cleanPath = cleanUrl
  .replace(/^https?:\/\/[^/]+\//i, "")
  .replace(/^\/+/, "")

for(const m of matchedImages){
const cleanMatch = normalizeImageUrl(m)
const cleanMatchPath = cleanMatch
  .replace(/^https?:\/\/[^/]+\//i, "")
  .replace(/^\/+/, "")

if(cleanMatch === cleanUrl || cleanMatchPath === cleanPath){
return true
}

if(cleanPath && cleanMatchPath && (cleanUrl.endsWith(cleanMatchPath) || cleanMatch.endsWith(cleanPath))){
return true
}
}

return false
}

function getSafeFileName(url, fallback = "photo.jpg"){
try{
const cleanUrl = normalizeImageUrl(url)
const rawName = cleanUrl.split("/").pop() || fallback
const decoded = decodeURIComponent(rawName)
const safeName = decoded.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim()
return safeName || fallback
}catch(e){
return fallback
}
}

function getPhotoSequenceName(photo){
const key =
photo?.object_key ||
photo?.preview_key ||
photo?.thumbnail_key ||
""

try{
const cleanKey = normalizeImageUrl(key)
const fileName = decodeURIComponent(cleanKey.split("/").pop() || "")
return fileName.toLowerCase()
}catch(e){
return String(key || "").toLowerCase()
}
}

function naturalCompareText(a, b){
return String(a || "").localeCompare(String(b || ""), undefined, {
numeric: true,
sensitivity: "base"
})
}

function sortPhotosByFileSequence(photos){
return (photos || []).slice().sort((a, b) => {
const nameA = getPhotoSequenceName(a)
const nameB = getPhotoSequenceName(b)

const nameCompare = naturalCompareText(nameA, nameB)
if(nameCompare !== 0) return nameCompare

const dateA = new Date(a?.created_at || 0).getTime()
const dateB = new Date(b?.created_at || 0).getTime()

if(dateA !== dateB) return dateA - dateB

return naturalCompareText(a?.id, b?.id)
})
}

async function triggerBlobDownload(blob, filename){
if(isCapacitorNativeApp()){
await saveBlobWithCapacitor(blob, filename, "StudioOS File")
return true
}

const blobUrl = URL.createObjectURL(blob)
const a = document.createElement("a")
a.href = blobUrl
a.download = filename
document.body.appendChild(a)
a.click()
a.remove()

setTimeout(()=>{
URL.revokeObjectURL(blobUrl)
}, 3000)

return true
}

function getDownloadLogFileSize(photo, fallbackBytes = 0){
const candidates = [
photo?.original_file_size,
photo?.file_size,
photo?.stored_file_size,
fallbackBytes
]

for(const value of candidates){
const size = Number(value || 0)
if(Number.isFinite(size) && size > 0){
return Math.round(size)
}
}

return 0
}

async function logGalleryDownload(context = {}, downloadedBytes = 0){
try{
const photo = context.photo || {}
const safeEventId = String(context.eventId || photo.event_id || "").trim()
const safePhotoId = String(photo.id || context.photoId || "").trim()
const safeUserId = String(context.photographerId || photo.user_id || context.userId || "").trim()
const safeObjectKey = String(photo.object_key || context.objectKey || "").trim()

const downloadSize = Number(downloadedBytes || 0)
const fileSize = getDownloadLogFileSize(photo, downloadSize)

if(!safeEventId && !safePhotoId && !safeObjectKey){
return
}

const payload = {
type: "download",
user_id: safeUserId || null,
event_id: safeEventId || null,
photo_id: safePhotoId || null,
role: String(CURRENT_GALLERY_STATE?.effectiveRole || sessionStorage.getItem("role") || "guest").trim(),
file_type: String(context.fileType || "original").trim(),
file_size_bytes: fileSize,
downloaded_bytes: Number.isFinite(downloadSize) && downloadSize > 0 ? Math.round(downloadSize) : fileSize,
download_type: String(context.downloadType || "gallery_download").trim(),
object_key: safeObjectKey || null,
source: String(context.source || "gallery_modal").trim()
}

await fetch(GALLERY_TRACK_USAGE_URL, {
method: "POST",
headers: {
"Content-Type": "application/json",
"apikey": window.SUPABASE_ANON_KEY || ""
},
body: JSON.stringify(payload)
}).then(async response=>{
if(!response.ok){
const errorData = await response.json().catch(()=>null)
throw new Error(errorData?.error || "Download usage tracking failed")
}
})
}catch(err){
console.warn("Download usage log failed:", err)
}
}

async function directDownloadImage(url, filename = "photo.jpg", logContext = null){
const cleanUrl = normalizeImageUrl(url)

try{
const response = await fetch(cleanUrl, {
method: "GET",
mode: "cors",
cache: "no-store"
})

if(!response.ok){
throw new Error("Failed to fetch file for download")
}

const blob = await response.blob()
await triggerBlobDownload(blob, filename)
showStudioOSToast("Photo downloaded")

if(logContext){
logGalleryDownload(logContext, blob.size).catch(()=>{})
}

return true
}catch(err){
console.error("Download fallback triggered:", err)

if(isCapacitorNativeApp()){
showStudioOSToast("Download failed. Please try again.", "error")
return false
}

try{
const a = document.createElement("a")
a.href = cleanUrl
a.download = filename
a.rel = "noopener"
document.body.appendChild(a)
a.click()
a.remove()

if(logContext){
const fallbackSize = getDownloadLogFileSize(logContext.photo || {}, 0)
logGalleryDownload({
...logContext,
source: `${String(logContext.source || "gallery_modal")}_link_fallback`
}, fallbackSize).catch(()=>{})
}

return true
}catch(linkErr){
console.error("Direct link download failed:", linkErr)
showStudioOSToast("Download failed. Please try again.", "error")
return false
}
}
}

window.logGalleryDownloadUsage = logGalleryDownload

function readJsonSessionArray(key){
try{
const raw = sessionStorage.getItem(key)
if(!raw) return []
const parsed = JSON.parse(raw)
return Array.isArray(parsed) ? parsed : []
}catch(e){
return []
}
}

function readJsonSessionObject(key){
try{
const raw = sessionStorage.getItem(key)
if(!raw) return null
const parsed = JSON.parse(raw)
return parsed && typeof parsed === "object" ? parsed : null
}catch(e){
return null
}
}

function getGuestMatchedImagesFromSession(eventId){
const matched = new Set()
const safeEventId = String(eventId || "").trim()
const scanEventId = String(sessionStorage.getItem("face_scan_event_id") || "").trim()

const byEventMaps = [
"matched_images_by_event",
"matched_image_urls_by_event",
"face_matched_images_by_event"
]

byEventMaps.forEach(key=>{
const mapValue = readJsonSessionObject(key)
if(mapValue && safeEventId && Array.isArray(mapValue[safeEventId])){
mapValue[safeEventId].forEach(url=>{
const clean = normalizeImageUrl(url)
if(clean){
matched.add(clean)
}
})
}
})

if(matched.size > 0){
return matched
}

// Backward compatibility: direct arrays are accepted only when they belong to the same event.
if(scanEventId && safeEventId && scanEventId !== safeEventId){
return matched
}

const directArrays = [
"matched_images",
"matched_image_urls",
"face_matched_images",
"face_match_images",
"guest_matched_images"
]

directArrays.forEach(key=>{
const values = readJsonSessionArray(key)
values.forEach(url=>{
const clean = normalizeImageUrl(url)
if(clean){
matched.add(clean)
}
})
})

return matched
}

function hasValidGuestFaceSession(eventId){
const matchedImages = getGuestMatchedImagesFromSession(eventId)
return !!(matchedImages && matchedImages.size > 0)
}

function resolveEffectiveRole(sessionRole, currentUserId, eventOwnerId){
if(currentUserId && eventOwnerId && String(currentUserId) === String(eventOwnerId)){
return "photographer"
}
if(sessionRole === "client"){
return "client"
}
return "guest"
}

function getGuestPreviewUrl(photo){
const previewUrl = getPhotoPreviewUrl(photo)
if(previewUrl) return previewUrl
return getPhotoOriginalUrl(photo)
}

function getDisplayImageUrl(photo, role, guestFreeDownload = false){
const originalUrl = getPhotoOriginalUrl(photo)
const previewUrl = getPhotoPreviewUrl(photo)

if(role === "photographer" || role === "client"){
return previewUrl || originalUrl
}

if(role === "guest" && guestFreeDownload){
return previewUrl || originalUrl
}

return previewUrl || originalUrl
}

function getModalImagesList(photos, effectiveRole, matchedImages, faceFilterActive){
return (photos || []).filter(photo => {
const cleanOriginalUrl = getPhotoOriginalUrl(photo)
if(!cleanOriginalUrl) return false

if(effectiveRole === "guest"){
if(!isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}
}

if((effectiveRole === "client" || effectiveRole === "photographer") && faceFilterActive){
if(!isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}
}

return true
})
}

function getVisibleGalleryPhotos(photos, effectiveRole, matchedImages, faceFilterActive){
return (photos || []).filter(photo => {
const cleanOriginalUrl = getPhotoOriginalUrl(photo)
if(!cleanOriginalUrl) return false

if(effectiveRole === "guest" && !isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}

if((effectiveRole === "client" || effectiveRole === "photographer") && faceFilterActive && !isMatchedImage(cleanOriginalUrl, matchedImages)){
return false
}

return true
})
}

function applyGuestImageProtection(target){
if(!target) return

target.setAttribute("draggable", "false")
target.style.webkitUserDrag = "none"
target.style.userSelect = "none"

if(target.dataset.guestProtectionApplied === "true"){
return
}

target.dataset.guestProtectionApplied = "true"

target.addEventListener("dragstart", (e)=>{
e.preventDefault()
})

target.addEventListener("contextmenu", (e)=>{
e.preventDefault()
})
}

function waitForGalleryIdle(){
return new Promise(resolve=>{
if("requestIdleCallback" in window){
window.requestIdleCallback(resolve, { timeout: 250 })
return
}
setTimeout(resolve, GALLERY_RENDER_IDLE_DELAY)
})
}

function getTransparentImagePlaceholder(){
return "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%3E%3Crect%20width='16'%20height='16'%20fill='%23111827'/%3E%3C/svg%3E"
}

let galleryImageObserver = null

function getGalleryImageObserver(){
if(galleryImageObserver){
return galleryImageObserver
}

if(!("IntersectionObserver" in window)){
return null
}

galleryImageObserver = new IntersectionObserver((entries)=>{
entries.forEach(entry=>{
if(!entry.isIntersecting) return

const img = entry.target
const src = img.dataset.src || ""

if(src){
img.src = src
img.removeAttribute("data-src")
}

galleryImageObserver.unobserve(img)
})
}, {
root: null,
rootMargin: GALLERY_IMAGE_OBSERVER_ROOT_MARGIN,
threshold: 0.01
})

return galleryImageObserver
}

function activateGalleryImageLazyLoad(img){
if(!img) return

const observer = getGalleryImageObserver()

if(observer){
observer.observe(img)
return
}

const src = img.dataset.src || ""
if(src){
img.src = src
img.removeAttribute("data-src")
}
}

function trimImagePreloadCache(cache){
if(!cache || cache.size <= IMAGE_PRELOAD_CACHE_LIMIT) return

const overflow = cache.size - IMAGE_PRELOAD_CACHE_LIMIT
let removed = 0

for(const key of cache.keys()){
cache.delete(key)
removed += 1
if(removed >= overflow) break
}
}

function preloadImageUrl(url, cache = modalImagePreloadCache){
const cleanUrl = normalizeImageUrl(url)
if(!cleanUrl) return Promise.resolve(false)

if(cache.has(cleanUrl)){
return cache.get(cleanUrl)
}

const preloadPromise = new Promise(resolve=>{
const img = new Image()
img.decoding = "async"
img.onload = ()=> resolve(true)
img.onerror = ()=> resolve(false)
img.src = cleanUrl
})

cache.set(cleanUrl, preloadPromise)
trimImagePreloadCache(cache)

return preloadPromise
}

function warmGalleryPreviewImages(photos, startIndex, count, effectiveRole, guestFreeDownload){
if(!photos || !photos.length) return

const runWarmup = ()=>{
const endIndex = Math.min(startIndex + count, photos.length)

for(let i = startIndex; i < endIndex; i++){
const photo = photos[i]
if(!photo) continue

let url = getPhotoThumbnailUrl(photo)

if(!photo.thumbnail_key){
url = getPhotoPreviewUrl(photo) || getDisplayImageUrl(photo, effectiveRole, guestFreeDownload)
}

if(url){
preloadImageUrl(url, galleryPreviewPreloadCache)
}
}
}

if("requestIdleCallback" in window){
window.requestIdleCallback(runWarmup, { timeout: 500 })
return
}

setTimeout(runWarmup, 80)
}

function preloadModalAroundIndex(photos, currentIndex, effectiveRole, guestFreeDownload){
if(!photos || !photos.length || currentIndex < 0) return

for(let offset = 1; offset <= MODAL_PRELOAD_RANGE; offset++){
const nextPhoto = photos[currentIndex + offset]
const prevPhoto = photos[currentIndex - offset]

if(nextPhoto){
preloadImageUrl(getDisplayImageUrl(nextPhoto, effectiveRole, guestFreeDownload), modalImagePreloadCache)
}

if(prevPhoto){
preloadImageUrl(getDisplayImageUrl(prevPhoto, effectiveRole, guestFreeDownload), modalImagePreloadCache)
}
}
}

function updateModalImageWithPremiumTransition(modalImg, imageUrl){
if(!modalImg || !imageUrl) return

const cleanUrl = normalizeImageUrl(imageUrl)

if(modalImg.dataset.currentImageUrl === cleanUrl){
return
}

modalImg.dataset.currentImageUrl = cleanUrl
modalImg.style.opacity = "0.35"
modalImg.style.transform = "scale(0.985)"

const applyLoadedState = ()=>{
requestAnimationFrame(()=>{
modalImg.style.opacity = "1"
modalImg.style.transform = "scale(1)"
})
}

const cached = modalImagePreloadCache.get(cleanUrl)

if(cached){
cached.finally(()=>{
modalImg.src = cleanUrl
if(typeof modalImg.decode === "function"){
modalImg.decode().catch(()=>{}).finally(applyLoadedState)
return
}
applyLoadedState()
})
return
}

modalImg.src = cleanUrl
preloadImageUrl(cleanUrl, modalImagePreloadCache).finally(applyLoadedState)
}

function buildToggleMarkup(eventId, isGuestFree){
const bgColor = isGuestFree ? "#6366f1" : "rgba(255,255,255,0.28)"
const knobLeft = isGuestFree ? "22px" : "2px"

return `
<label class="guest-download-toggle inline-flex items-center cursor-pointer select-none" onclick="event.stopPropagation()">
  <input
    type="checkbox"
    class="sr-only"
    ${isGuestFree ? "checked" : ""}
    onchange="toggleGuestFreeDownload('${eventId}', ${isGuestFree ? "true" : "false"})"
  />
  <div style="
    position: relative;
    width: 40px;
    height: 20px;
    border-radius: 9999px;
    background: ${bgColor};
    transition: background 0.2s ease;
  ">
    <span style="
      position: absolute;
      top: 2px;
      left: ${knobLeft};
      width: 16px;
      height: 16px;
      border-radius: 9999px;
      background: #ffffff;
      transition: left 0.2s ease;
      display: block;
    "></span>
  </div>
</label>
`
}

function getFaceScanUrl(eventId, role = "client"){
const safeRole = role === "photographer" ? "photographer" : "client"
const redirectUrl = requireStudioOSPublicPageUrl("gallery.html", { event_id: eventId })
return requireStudioOSPublicPageUrl("face-capture.html", {
event_id: eventId,
role: safeRole,
redirect: redirectUrl
})
}

function getFaceFilterDisabledSessionKey(eventId){
return `face_filter_disabled_${String(eventId || "").trim()}`
}

function isFaceFilterDisabledForEvent(eventId){
try{
return sessionStorage.getItem(getFaceFilterDisabledSessionKey(eventId)) === "true"
}catch(e){
return false
}
}

function setFaceFilterDisabledForEvent(eventId, disabled){
try{
const key = getFaceFilterDisabledSessionKey(eventId)
if(disabled){
sessionStorage.setItem(key, "true")
}else{
sessionStorage.removeItem(key)
}
}catch(e){}
}

function updateFaceActionButton(){

const btn = document.getElementById("faceActionBtn")
if(!btn) return

const { eventId, effectiveRole, matchedImages } = CURRENT_GALLERY_STATE
const canShowFaceAction = effectiveRole === "client" || effectiveRole === "photographer"

if(!eventId || !canShowFaceAction){
btn.classList.add("hidden")
btn.onclick = null
return
}

btn.classList.remove("hidden")

if(matchedImages && matchedImages.size > 0 && FACE_FILTER_ACTIVE){
btn.innerText = "All Photos"
btn.onclick = function(){
setFaceFilterDisabledForEvent(eventId, true)
FACE_FILTER_ACTIVE = false
loadGallery()
}
return
}

FACE_FILTER_ACTIVE = false
btn.innerText = "Face Scan"
btn.onclick = async function(){

// Photographer-side action remains protected by the subscription/feature gate.
// Client/public viewers should not see photographer upgrade or limit popups here;
// they already reached this page through a valid public access flow, and the
// actual face-search permission is validated again on face-capture.html.
if(effectiveRole === "photographer"){
const allowed = await guardPublicGalleryFeature(eventId, "face_search")
if(!allowed) return

const token = await ensurePublicShareToken(eventId)
if(!token){
alert("Unable to enable limited Face Search. Please try again.")
return
}
}

setFaceFilterDisabledForEvent(eventId, false)
window.location.href = getFaceScanUrl(eventId, effectiveRole)
}

}

function updateUploadButton(effectiveRole){

const uploadBtn = document.getElementById("uploadBtn")
if(!uploadBtn) return

if(effectiveRole === "photographer"){
uploadBtn.classList.remove("hidden")
uploadBtn.disabled = false
}else{
uploadBtn.classList.add("hidden")
uploadBtn.disabled = true
}
}


// =============================
// LOAD GALLERY
// =============================

async function loadGallery(){

const params = new URLSearchParams(window.location.search)

let eventId =
params.get("event_id") ||
params.get("event") ||
""

if(eventId){
sessionStorage.setItem("event_id", eventId)
}

if(eventId){
eventId = String(eventId).trim()
if(eventId === "null" || eventId === "undefined" || eventId === ""){
eventId = null
}
}else{
eventId = null
}

const supabase = await window.getSupabase()

let user = null
try{
user = await window.getCurrentUser()
}catch(e){
user = null
}

const sessionRole = sessionStorage.getItem("role") || "guest"
const accessGranted = sessionStorage.getItem("gallery_access")
const sessionEventId = sessionStorage.getItem("event_id")
const visitorId = sessionStorage.getItem("visitor_id")

let eventName = "Event"
let eventOwnerId = null
let guestFreeDownload = false
let eventStatus = "active"

if(eventId){
const { data: ev, error: eventFetchError } = await supabase
.from("events")
.select("event_name, client_name, user_id, guest_free_download, status")
.eq("id", eventId)
.maybeSingle()

if(eventFetchError){
console.error("Event fetch failed:", eventFetchError)
}

if(ev){
eventName = ev.event_name || ev.client_name || "Event"
eventOwnerId = ev.user_id || null
guestFreeDownload = !!ev.guest_free_download
eventStatus = normalizeGallerySharingStatus(ev.status)
}else{
clearDeletedEventSession(eventId)

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

if(grid){
grid.innerHTML = ""
}

if(empty){
empty.innerText = "This event was deleted or no longer exists"
empty.classList.remove("hidden")
}

updateUploadButton("photographer")

if(user){
setTimeout(()=>{
window.location.href = "gallery.html"
}, 900)
}else{
setTimeout(()=>{
window.location.href = "access.html"
}, 900)
}

return
}
}

const effectiveRole = resolveEffectiveRole(
sessionRole,
user?.id || null,
eventOwnerId
)

updateUploadButton(effectiveRole)

if(eventId && effectiveRole !== "photographer" && isGallerySharingStopped(eventStatus)){
clearDeletedEventSession(eventId)

const stoppedGrid = document.getElementById("galleryGrid")
const stoppedEmpty = document.getElementById("emptyState")
const stoppedFaceBanner = document.getElementById("faceMatchBanner")

if(stoppedGrid){
stoppedGrid.innerHTML = ""
stoppedGrid.classList.add("hidden")
}

if(stoppedFaceBanner){
stoppedFaceBanner.classList.remove("show")
}

if(stoppedEmpty){
stoppedEmpty.className = "mt-6"
stoppedEmpty.innerHTML = `
  <div style="
    border-radius:1.35rem;
    padding:1.2rem;
    background:rgba(15,23,42,0.92);
    border:1px solid rgba(251,191,36,0.28);
    box-shadow:0 24px 60px rgba(0,0,0,0.32), inset 0 0 20px rgba(251,191,36,0.06);
    text-align:center;
  ">
    <div style="
      display:inline-flex;
      align-items:center;
      min-height:30px;
      padding:0 0.78rem;
      border-radius:999px;
      background:rgba(251,191,36,0.14);
      border:1px solid rgba(251,191,36,0.28);
      color:rgb(253 230 138);
      font-size:0.72rem;
      font-weight:850;
      letter-spacing:0.08em;
      text-transform:uppercase;
    ">Gallery Closed</div>
    <div style="margin-top:0.95rem; font-size:1.12rem; font-weight:900; color:white; line-height:1.3;">
      This gallery is currently closed by the photographer.
    </div>
    <div style="margin-top:0.55rem; color:rgba(255,255,255,0.68); font-size:0.9rem; line-height:1.55;">
      Please contact the photographer if you need access again.
    </div>
  </div>
`
stoppedEmpty.classList.remove("hidden")
}

updateUploadButton(effectiveRole)
updateFaceActionButton()

return
}

if(effectiveRole === "photographer"){
console.log("👤 Photographer access (owner verified)")
}else{

if(eventId){

if(accessGranted !== "true"){
window.location.href = `access.html?event_id=${eventId}`
return
}

if(!sessionEventId || sessionEventId !== eventId){
window.location.href = `access.html?event_id=${eventId}`
return
}

if(!visitorId){
window.location.href = `access.html?event_id=${eventId}`
return
}

if(effectiveRole === "guest" && !hasValidGuestFaceSession(eventId)){
window.location.href = `access.html?event_id=${eventId}`
return
}

console.log("✅ Guest/Client verified | Role:", effectiveRole)

}

}

console.log("FINAL EVENT ID:", eventId)

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

let matchedImages = new Set()

if(effectiveRole === "guest" && eventId){
const sessionMatchedImages = getGuestMatchedImagesFromSession(eventId)
sessionMatchedImages.forEach(url=>{
matchedImages.add(url)
})
}

if((effectiveRole === "client" || effectiveRole === "photographer") && eventId){
const sessionMatchedImages = getGuestMatchedImagesFromSession(eventId)
sessionMatchedImages.forEach(url=>{
matchedImages.add(url)
})

if(matchedImages.size > 0 && !isFaceFilterDisabledForEvent(eventId)){
FACE_FILTER_ACTIVE = true
}
}

CURRENT_GALLERY_STATE = {
eventId,
effectiveRole,
matchedImages
}

updateFaceActionButton()

if(!grid || !empty){
return
}

grid.innerHTML = ""
empty.classList.add("hidden")

if(!eventId){

const faceBtn = document.getElementById("faceActionBtn")
if(faceBtn){
faceBtn.classList.add("hidden")
faceBtn.onclick = null
}

updateUploadButton("photographer")

if(!user){
window.location.href = "access.html"
return
}

const { data: events, error } =
await supabase
.from("events")
.select("*")
.eq("user_id", user.id)
.order("event_date",{ ascending:false })

if(error){
empty.classList.remove("hidden")
empty.innerText = "Failed to load events"
return
}

if(!events || events.length === 0){
empty.innerText = "No events found"
empty.classList.remove("hidden")
return
}

grid.innerHTML = ""
empty.classList.add("hidden")

events.forEach(e=>{

if(!e || !e.id) return

const div = document.createElement("div")

div.className =
"glass rounded-xl p-3 relative overflow-visible hover:scale-105 transition"
div.dataset.galleryEventId = String(e.id)

const date =
e.event_date ? new Date(e.event_date).toLocaleDateString("en-IN") : ""

let displayName = e.client_name || e.event_name || "Event"

if(displayName && displayName.startsWith("Q_")){
displayName = e.client_name || "Booking Event"
}

const isGuestFree = !!e.guest_free_download
const galleryStatus = normalizeGallerySharingStatus(e.status)
const isSharingStopped = isGallerySharingStopped(galleryStatus)
setEventPhotoPriceCache(e.id, e.photo_selling_price)

div.innerHTML = `
<div class="flex justify-between items-start gap-3">
  <div class="min-w-0 flex-1">
    <div class="text-sm font-semibold truncate">${displayName}</div>
    <div class="text-xs text-gray-400">${date}</div>
    ${isSharingStopped ? `<div class="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/20">Sharing Stopped</div>` : ""}
  </div>

  <div class="flex items-center gap-2 shrink-0">
    ${buildToggleMarkup(e.id, isGuestFree)}
    <button onclick="toggleMenu('${e.id}', this, ${isGuestFree ? "true" : "false"}, '${galleryStatus}')" class="text-xl px-1 leading-none">⋮</button>
  </div>
</div>
`

grid.appendChild(div)

})

return

}

const safeEventId = String(eventId)

const { data, error } =
await supabase
.from("gallery_photos")
.select("id,user_id,event_id,storage_provider,bucket,object_key,preview_key,thumbnail_key,file_size,width,height,original_file_size,stored_file_size,sequence_number,created_at")
.eq("event_id", safeEventId)
.order("sequence_number",{ ascending:true })
.order("id",{ ascending:true })

const photographerId = data && data.length > 0 ? data[0].user_id : null

if(error){
empty.classList.remove("hidden")
empty.innerText = "Failed to load photos"
return
}

grid.innerHTML = ""
empty.classList.add("hidden")

if(!data || data.length === 0){
empty.innerText = "No photos uploaded for this event"
empty.classList.remove("hidden")
return
}

if(effectiveRole === "guest"){
if(matchedImages.size === 0){
empty.innerText = "No photos found for your face"
empty.classList.remove("hidden")
return
}
}

const visiblePhotos = sortPhotosByFileSequence(
getVisibleGalleryPhotos(data, effectiveRole, matchedImages, FACE_FILTER_ACTIVE)
)


const modalPhotos = visiblePhotos
let currentModalIndex = -1

function updateModalButtonStates(){
const prevBtn = document.getElementById("prevImageBtn")
const nextBtn = document.getElementById("nextImageBtn")

if(!prevBtn || !nextBtn) return

const hasPrev = currentModalIndex > 0
const hasNext = currentModalIndex >= 0 && currentModalIndex < modalPhotos.length - 1

prevBtn.disabled = !hasPrev
nextBtn.disabled = !hasNext
prevBtn.style.opacity = hasPrev ? "1" : "0.4"
nextBtn.style.opacity = hasNext ? "1" : "0.4"
}

function renderModalPhoto(photo){
const cleanOriginalUrl = getPhotoOriginalUrl(photo)
const displayUrl = getDisplayImageUrl(photo, effectiveRole, guestFreeDownload)
const modalImg = document.getElementById("modalImg")
const btn = document.getElementById("downloadBtn")

if(!modalImg || !btn) return

updateModalImageWithPremiumTransition(modalImg, displayUrl)

if(effectiveRole === "guest"){
applyGuestImageProtection(modalImg)
}else{
modalImg.setAttribute("draggable", "false")
}

btn.onclick = async function(){
if(btn.dataset.loading === "true"){
return
}

const originalText = btn.innerText
btn.dataset.loading = "true"
btn.innerText = isCapacitorNativeApp() ? "Preparing..." : "Downloading..."
btn.style.opacity = "0.75"
btn.disabled = true

try{

if(effectiveRole === "photographer" || effectiveRole === "client"){
const fileName = getSafeFileName(cleanOriginalUrl, "photo.jpg")
await directDownloadImage(cleanOriginalUrl, fileName, {
eventId,
photo,
photographerId,
downloadType: effectiveRole === "photographer" ? "photographer_original" : "client_original",
source: "gallery_modal"
})
return
}

if(guestFreeDownload){
const fileName = getSafeFileName(cleanOriginalUrl, "photo.jpg")
await directDownloadImage(cleanOriginalUrl, fileName, {
eventId,
photo,
photographerId,
downloadType: "guest_free_original",
source: "gallery_modal"
})
return
}

if(typeof window.handleDownload === "function"){
window.handleDownload(cleanOriginalUrl, eventId, photographerId, eventName, {
guestFreeDownload: false,
previewUrl: getGuestPreviewUrl(photo),
photo,
downloadLogContext: {
eventId,
photo,
photographerId,
downloadType: "guest_paid_original",
source: "gallery_paid_download"
}
})
return
}

const previewFileName = getSafeFileName(displayUrl, "photo.jpg")
await directDownloadImage(displayUrl, previewFileName, {
eventId,
photo,
photographerId,
downloadType: "guest_preview_fallback",
source: "gallery_modal"
})

}catch(downloadError){
console.error("Gallery modal download failed:", downloadError)
showStudioOSToast("Download failed. Please try again.", "error")
}finally{
btn.dataset.loading = "false"
btn.innerText = originalText
btn.style.opacity = "1"
btn.disabled = false
}

}

preloadModalAroundIndex(modalPhotos, currentModalIndex, effectiveRole, guestFreeDownload)
updateModalButtonStates()
}

function showPrevImage(){
if(currentModalIndex <= 0) return
currentModalIndex -= 1
renderModalPhoto(modalPhotos[currentModalIndex])
}

function showNextImage(){
if(currentModalIndex < 0 || currentModalIndex >= modalPhotos.length - 1) return
currentModalIndex += 1
renderModalPhoto(modalPhotos[currentModalIndex])
}

async function openImage(photo){
currentModalIndex = modalPhotos.findIndex(item => getPhotoOriginalUrl(item) === getPhotoOriginalUrl(photo))
if(currentModalIndex < 0){
currentModalIndex = 0
}
if(!modalPhotos.length){
return
}

let modal = document.getElementById("imageModal")

if(!modal){
modal = document.createElement("div")
modal.id = "imageModal"
modal.style.position = "fixed"
modal.style.top = 0
modal.style.left = 0
modal.style.width = "100%"
modal.style.height = "100%"
modal.style.background = "rgba(0,0,0,0.9)"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.zIndex = 9999

modal.innerHTML = `
<button id="prevImageBtn"
style="position:absolute; left:max(10px, env(safe-area-inset-left)); top:50%; transform:translateY(-50%); background:rgba(79,70,229,0.9); color:white; width:42px; height:42px; border-radius:9999px; font-size:22px; display:flex; align-items:center; justify-content:center; z-index:10002; pointer-events:auto; box-shadow:0 12px 32px rgba(0,0,0,0.35);">‹</button>

<img id="modalImg" src="" style="max-width:90%; max-height:70vh; object-fit:contain; border-radius:14px; transition:opacity 180ms ease, transform 180ms ease; will-change:opacity, transform; box-shadow:0 24px 80px rgba(0,0,0,0.45); position:relative; z-index:10000;" />

<button id="nextImageBtn"
style="position:absolute; right:max(10px, env(safe-area-inset-right)); top:50%; transform:translateY(-50%); background:rgba(79,70,229,0.9); color:white; width:42px; height:42px; border-radius:9999px; font-size:22px; display:flex; align-items:center; justify-content:center; z-index:10002; pointer-events:auto; box-shadow:0 12px 32px rgba(0,0,0,0.35);">›</button>

<button id="downloadBtn"
style="position:absolute; left:50%; transform:translateX(-50%); bottom:calc(112px + env(safe-area-inset-bottom, 0px)); background:#4f46e5; color:white; padding:10px 18px; border-radius:999px; font-size:14px; font-weight:800; z-index:10003; box-shadow:0 16px 42px rgba(79,70,229,0.38);">
Download
</button>
`

modal.onclick = (e)=>{ if(e.target === modal) modal.remove() }

document.body.appendChild(modal)

document.getElementById("prevImageBtn").onclick = function(e){
e.stopPropagation()
showPrevImage()
}

document.getElementById("nextImageBtn").onclick = function(e){
e.stopPropagation()
showNextImage()
}

document.addEventListener("keydown", function modalKeyHandler(e){
const imageModal = document.getElementById("imageModal")
if(!imageModal) return

if(e.key === "ArrowLeft"){
showPrevImage()
}
if(e.key === "ArrowRight"){
showNextImage()
}
if(e.key === "Escape"){
imageModal.remove()
document.removeEventListener("keydown", modalKeyHandler)
}
})

renderModalPhoto(modalPhotos[currentModalIndex])

}else{
renderModalPhoto(modalPhotos[currentModalIndex])
}
}

let renderedPhotoCount = 0

function createGalleryPhotoCard(photo, index = 0){

const cleanOriginalUrl = getPhotoOriginalUrl(photo)
if(!cleanOriginalUrl) return null

const displayUrl = getDisplayImageUrl(photo, effectiveRole, guestFreeDownload)
let thumbnailUrl = getPhotoThumbnailUrl(photo)

if(!photo.thumbnail_key){
thumbnailUrl = getPhotoPreviewUrl(photo) || displayUrl
}

const div = document.createElement("div")

div.className =
"glass rounded-xl overflow-hidden cursor-pointer"

const shouldPrioritize = index < GALLERY_PRIORITY_IMAGE_COUNT

const initialImageSrc = shouldPrioritize ? thumbnailUrl : getTransparentImagePlaceholder()
const lazyImageSrc = shouldPrioritize ? "" : thumbnailUrl

div.innerHTML = `
<img src="${initialImageSrc}"
${lazyImageSrc ? `data-src="${lazyImageSrc}"` : ""}
class="w-full h-40 object-cover hover:scale-105 transition"
style="background:#111827; transform:translateZ(0);"
loading="${shouldPrioritize ? "eager" : "lazy"}"
decoding="async"
fetchpriority="${shouldPrioritize ? "high" : "low"}" />
`

const imageEl = div.querySelector("img")

if(effectiveRole === "guest"){
applyGuestImageProtection(imageEl)
}

imageEl.onerror = function(){
if(displayUrl && imageEl.src !== displayUrl){
imageEl.src = displayUrl
return
}
imageEl.onerror = null
}

if(!shouldPrioritize){
activateGalleryImageLazyLoad(imageEl)
}

div.onclick = () => openImage(photo)

return div
}

function removeLoadMoreButton(){
const existing = document.getElementById("galleryLoadMoreBtn")
if(existing){
existing.remove()
}
}

function renderPhotoBatch(){
removeLoadMoreButton()

const fragment = document.createDocumentFragment()
const nextLimit = Math.min(renderedPhotoCount + GALLERY_RENDER_BATCH_SIZE, visiblePhotos.length)

for(let i = renderedPhotoCount; i < nextLimit; i++){
const card = createGalleryPhotoCard(visiblePhotos[i], i)
if(card){
fragment.appendChild(card)
}
}

grid.appendChild(fragment)
warmGalleryPreviewImages(
visiblePhotos,
nextLimit,
GALLERY_PRELOAD_AHEAD_COUNT,
effectiveRole,
guestFreeDownload
)
renderedPhotoCount = nextLimit

if(renderedPhotoCount < visiblePhotos.length){
const loadMoreBtn = document.createElement("button")
loadMoreBtn.id = "galleryLoadMoreBtn"
loadMoreBtn.type = "button"
loadMoreBtn.className = "col-span-full mt-4 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-sm font-medium"
loadMoreBtn.innerText = `Load more (${visiblePhotos.length - renderedPhotoCount} left)`
loadMoreBtn.onclick = async function(){
loadMoreBtn.disabled = true
loadMoreBtn.innerText = "Loading..."
await waitForGalleryIdle()
renderPhotoBatch()
}
grid.appendChild(loadMoreBtn)
}
}

renderPhotoBatch()

if(effectiveRole === "guest" && grid.children.length === 0){
empty.innerText = "No photos found for your face"
empty.classList.remove("hidden")
}

if((effectiveRole === "client" || effectiveRole === "photographer") && FACE_FILTER_ACTIVE && grid.children.length === 0){
empty.innerText = "No face matched photos"
empty.classList.remove("hidden")
}

}

document.addEventListener("DOMContentLoaded",()=>{
loadGallery()
})
