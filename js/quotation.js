// =============================
// SAFE SUPABASE ACCESS (PERMANENT FIX)
// =============================

function getSupabase(){

if(window.supabaseClient){
return window.supabaseClient
}

throw new Error("Supabase client not initialized")

}

async function getCurrentUser(){

const supabase = getSupabase()

const { data:{ user } } =
await supabase.auth.getUser()

return user

}


// =============================
// SAFE ELEMENT GETTER
// =============================

function get(id){
return document.getElementById(id)
}


// =============================
// SLUG GENERATOR
// =============================

function slugify(text){

return text
.toString()
.toLowerCase()
.trim()
.replace(/\s+/g,"-")
.replace(/[^a-z0-9\-]/g,"")
.replace(/\-\-+/g,"-")

}


function isStudioOSNativeApp(){

try{

if(
window.Capacitor &&
typeof window.Capacitor.isNativePlatform === "function" &&
window.Capacitor.isNativePlatform()
){
return true
}

const protocol = String(window.location.protocol || "").toLowerCase()

return protocol === "capacitor:" || protocol === "file:"

}catch(error){

return false

}

}

function getStudioOSPublicBaseUrl(){

const configuredUrl = String(window.STUDIOOS_PUBLIC_BASE_URL || "").trim()

if(configuredUrl){
return configuredUrl.replace(/\/+$/,"")
}

return "https://adimasram333-tech.github.io/studioos"

}

function buildProposalPreviewUrl(clientName, shortId, quotationId){

const safeSlug = slugify(clientName || "proposal") || "proposal"
const slugPart = safeSlug + "-" + shortId

if(isStudioOSNativeApp()){
return "proposal.html?id=" + encodeURIComponent(quotationId) + "&slug=" + encodeURIComponent(slugPart)
}

return getStudioOSPublicBaseUrl() + "/p/" + slugPart

}

function openProposalPreview(clientName, shortId, quotationId){

const targetUrl = buildProposalPreviewUrl(clientName, shortId, quotationId)

try{

window.location.assign(targetUrl)

}catch(error){

window.location.href = targetUrl

}

}



// =============================
// EDIT MODE DETECTION
// =============================

let editId = null
let selectedProposalCoverFile = null
let existingProposalCoverImage = ""
let existingProposalTitleColor = ""
let proposalBrandingAllowed = false
let currentPlanProfile = null

function getQueryParam(name){
const url = new URL(window.location.href)
return url.searchParams.get(name)
}

editId = getQueryParam("edit")


// =============================
// PREMIUM BRANDING PLAN GATE
// =============================

function normalizePlanValue(value){

return String(value || "").trim().toLowerCase()

}

function isActivePaidPlan(profile){

if(!profile) return false

const plan = normalizePlanValue(profile.plan)
const status = normalizePlanValue(profile.subscription_status)
const isPaid = profile.is_paid === true
const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0
const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now()

return isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro")

}

function setProposalBrandingSectionVisible(isVisible){

const section = get("proposalBrandingSection")
const input = get("proposalCoverInput")
const chooseBtn = get("proposalCoverChooseBtn")
const removeBtn = get("proposalCoverRemoveBtn")

if(section){
section.style.display = isVisible ? "" : "none"
section.setAttribute("aria-hidden", isVisible ? "false" : "true")
}

if(input){
input.disabled = !isVisible
}

if(chooseBtn){
chooseBtn.disabled = !isVisible
chooseBtn.style.pointerEvents = isVisible ? "" : "none"
chooseBtn.style.opacity = isVisible ? "" : "0.65"
}

if(removeBtn){
removeBtn.disabled = !isVisible
removeBtn.style.pointerEvents = isVisible ? "" : "none"
removeBtn.style.opacity = isVisible ? "" : "0.65"
}

}

async function loadCurrentPlanProfile(userId){

try{

const supabase = getSupabase()

const { data, error } =
await supabase
.from("photographer_settings")
.select("plan, subscription_status, is_paid, plan_expires_at")
.eq("user_id", userId)
.maybeSingle()

if(error){
console.error("LOAD PLAN PROFILE ERROR:", error)
currentPlanProfile = null
proposalBrandingAllowed = false
setProposalBrandingSectionVisible(false)
return null
}

currentPlanProfile = data || null
proposalBrandingAllowed = isActivePaidPlan(currentPlanProfile)
setProposalBrandingSectionVisible(proposalBrandingAllowed)

return currentPlanProfile

}catch(err){
console.error("LOAD PLAN PROFILE ERROR:", err)
currentPlanProfile = null
proposalBrandingAllowed = false
setProposalBrandingSectionVisible(false)
return null
}

}


// =============================
// ANDROID COVER IMAGE COMPATIBILITY
// =============================

function isStudioOSNativeQuotationApp(){
try{
const protocol = String(window.location.protocol || "").toLowerCase()

if(
window.Capacitor &&
typeof window.Capacitor.isNativePlatform === "function" &&
window.Capacitor.isNativePlatform()
){
return true
}

return protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:"
}catch(error){
return false
}
}

function inferQuotationCoverMimeType(fileName, fallback = "image/jpeg"){
const name = String(fileName || "").toLowerCase()

if(name.endsWith(".png")) return "image/png"
if(name.endsWith(".webp")) return "image/webp"
if(name.endsWith(".gif")) return "image/gif"
if(name.endsWith(".heic")) return "image/heic"
if(name.endsWith(".heif")) return "image/heif"
if(name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"

return fallback
}

function isLikelyUnsupportedNativeCoverImage(file){
const name = String(file?.name || "").toLowerCase()
const type = String(file?.type || "").toLowerCase()

return (
name.endsWith(".heic") ||
name.endsWith(".heif") ||
type.includes("heic") ||
type.includes("heif")
)
}

async function normalizeProposalCoverFileForAndroid(file){
if(!file || !isStudioOSNativeQuotationApp()){
return file
}

try{
const fileName = file.name || `proposal-cover-${Date.now()}.jpg`
const inferredType = file.type || inferQuotationCoverMimeType(fileName)
const buffer = await file.arrayBuffer()

if(!buffer || !buffer.byteLength){
return file
}

const blob = new Blob([buffer], {
type: inferredType || "image/jpeg"
})

try{
return new File([blob], fileName, {
type: inferredType || blob.type || "image/jpeg",
lastModified: file.lastModified || Date.now()
})
}catch(_fileError){
blob.name = fileName
blob.lastModified = file.lastModified || Date.now()
return blob
}
}catch(error){
console.warn("Android proposal cover normalization skipped", error)
return file
}
}

function buildProposalCoverPreviewUrl(file){
try{
return URL.createObjectURL(file)
}catch(error){
return ""
}
}

function setQuotationPreviewButtonLoading(isLoading){
const button = get("previewBtn")
if(!button) return

button.disabled = !!isLoading
button.innerText = isLoading ? "Generating..." : "Preview Quote"
}

function setProposalCoverStatusText(message){
const statusEl = get("proposalCoverStatus")
if(statusEl && message){
statusEl.innerText = message
}
}

function syncQuotationDateFieldDisplay(){
try{
if(typeof window.syncStudioOSQuotationDateFields === "function"){
window.syncStudioOSQuotationDateFields()
return
}

const inputs = [
get("startDate"),
get("endDate")
]

inputs.forEach(function(input){
if(!input) return
const wrap = input.closest(".dateField")
if(!wrap) return

if(input.value){
wrap.classList.add("hasValue")
}else{
wrap.classList.remove("hasValue")
}
})
}catch(error){
console.warn("Quotation date display sync skipped:", error)
}
}

function injectQuotationAndroidDateLayoutFix(){
if(document.getElementById("studioos-quotation-date-layout-fix")){
return
}

const style = document.createElement("style")
style.id = "studioos-quotation-date-layout-fix"
style.textContent = `
@media (max-width: 768px){
  .dateRow{
    display:grid !important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important;
    gap:8px !important;
    width:100% !important;
    align-items:start !important;
  }

  .dateField{
    position:relative !important;
    min-width:0 !important;
    width:100% !important;
  }

  .dateFieldLabel{
    display:block !important;
    position:absolute !important;
    left:12px !important;
    top:50% !important;
    transform:translateY(-50%) !important;
    z-index:2 !important;
    color:#d1d5db !important;
    pointer-events:none !important;
    max-width:calc(100% - 42px) !important;
    white-space:nowrap !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
  }

  .dateField:not(.hasValue) .dateFieldLabel{
    opacity:1 !important;
    visibility:visible !important;
  }

  .dateField.hasValue .dateFieldLabel,
  .dateField:focus-within .dateFieldLabel{
    opacity:0 !important;
    visibility:hidden !important;
  }

  #startDate,
  #endDate{
    min-height:46px !important;
    height:46px !important;
    line-height:46px !important;
    padding:0 34px 0 10px !important;
    margin-bottom:8px !important;
    font-size:15px !important;
    white-space:nowrap !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
    background:#374151 !important;
  }

  .dateField:not(.hasValue) #startDate,
  .dateField:not(.hasValue) #endDate{
    color:transparent !important;
    -webkit-text-fill-color:transparent !important;
  }

  .dateField.hasValue #startDate,
  .dateField.hasValue #endDate,
  .dateField:focus-within #startDate,
  .dateField:focus-within #endDate{
    color:#ffffff !important;
    -webkit-text-fill-color:#ffffff !important;
  }

  #startDate::-webkit-date-and-time-value,
  #endDate::-webkit-date-and-time-value{
    text-align:left !important;
    min-height:46px !important;
    line-height:46px !important;
    padding:0 !important;
  }

  .dateField:not(.hasValue) #startDate::-webkit-date-and-time-value,
  .dateField:not(.hasValue) #endDate::-webkit-date-and-time-value{
    color:transparent !important;
    -webkit-text-fill-color:transparent !important;
  }

  .dateField.hasValue #startDate::-webkit-date-and-time-value,
  .dateField.hasValue #endDate::-webkit-date-and-time-value,
  .dateField:focus-within #startDate::-webkit-date-and-time-value,
  .dateField:focus-within #endDate::-webkit-date-and-time-value{
    color:#ffffff !important;
    -webkit-text-fill-color:#ffffff !important;
  }

  #startDate::-webkit-calendar-picker-indicator,
  #endDate::-webkit-calendar-picker-indicator{
    opacity:0.85 !important;
  }
}
`
document.head.appendChild(style)
}


// =============================
// PROPOSAL COVER UI HELPERS
// =============================

function setProposalCoverPreviewState(imageUrl,statusText,showRemove){

const previewWrap = get("proposalCoverPreviewWrap")
const previewImg = get("proposalCoverPreview")
const removeBtn = get("proposalCoverRemoveBtn")
const statusEl = get("proposalCoverStatus")

if(previewImg){
previewImg.src = imageUrl || ""
}

if(previewWrap){
if(imageUrl){
previewWrap.classList.add("show")
}else{
previewWrap.classList.remove("show")
}
}

if(removeBtn){
if(showRemove){
removeBtn.classList.remove("hidden")
}else{
removeBtn.classList.add("hidden")
}
}

if(statusEl){
statusEl.innerText = statusText || "Default image"
}

}

function resetProposalCoverSelection(){

selectedProposalCoverFile = null

const input = get("proposalCoverInput")
if(input){
input.value = ""
}

if(existingProposalCoverImage){
setProposalCoverPreviewState(
existingProposalCoverImage,
"Saved image",
true
)
}else{
setProposalCoverPreviewState(
"",
"Default image",
false
)
}

}

function initProposalCoverUI(){

const input = get("proposalCoverInput")
const chooseBtn = get("proposalCoverChooseBtn")
const removeBtn = get("proposalCoverRemoveBtn")

if(chooseBtn && input){
chooseBtn.addEventListener("click",function(){
if(!proposalBrandingAllowed){
return
}
input.value = ""
input.click()
})
}

if(input){

input.addEventListener("change",async function(e){

if(!proposalBrandingAllowed){
input.value = ""
selectedProposalCoverFile = null
return
}

const file = e.target.files?.[0]

if(!file){
selectedProposalCoverFile = null
if(existingProposalCoverImage){
setProposalCoverPreviewState(
existingProposalCoverImage,
"Saved image",
true
)
}else{
setProposalCoverPreviewState(
"",
"Default image",
false
)
}
return
}

const normalizedFile = await normalizeProposalCoverFileForAndroid(file)

if(isStudioOSNativeQuotationApp() && isLikelyUnsupportedNativeCoverImage(normalizedFile)){
alert("Please select a JPG, JPEG, PNG, or WEBP image for proposal cover.")
input.value = ""
selectedProposalCoverFile = null

if(existingProposalCoverImage){
setProposalCoverPreviewState(
existingProposalCoverImage,
"Saved image",
true
)
}else{
setProposalCoverPreviewState(
"",
"Default image",
false
)
}

return
}

selectedProposalCoverFile = normalizedFile

const previewUrl = buildProposalCoverPreviewUrl(normalizedFile)

if(previewUrl){
setProposalCoverPreviewState(
previewUrl,
"Uploading cover photo...",
true
)
}else{
const reader = new FileReader()

reader.onload = function(evt){
setProposalCoverPreviewState(
evt.target?.result || "",
"Uploading cover photo...",
true
)
}

reader.readAsDataURL(normalizedFile)
}

try{
await uploadSelectedProposalCoverImmediately()
}catch(error){
console.error("IMMEDIATE PROPOSAL COVER UPLOAD ERROR:", error)
alert(error?.message || "Cover photo upload failed. Please try again.")

if(existingProposalCoverImage){
setProposalCoverPreviewState(
existingProposalCoverImage,
"Saved image",
true
)
}else{
setProposalCoverPreviewState(
"",
"Default image",
false
)
}
}

})

}

if(removeBtn){

removeBtn.addEventListener("click",function(){

if(!proposalBrandingAllowed){
return
}

selectedProposalCoverFile = null
existingProposalCoverImage = ""
existingProposalTitleColor = ""

const inputEl = get("proposalCoverInput")
if(inputEl){
inputEl.value = ""
}

setProposalCoverPreviewState(
"",
"Default image",
false
)

})

}

setProposalCoverPreviewState(
"",
"Default image",
false
)

}


// =============================
// IMAGE PROCESSING HELPERS
// =============================

async function compressImage(file){

return new Promise((resolve,reject)=>{

try{

const img = new Image()
const reader = new FileReader()

reader.onload = function(e){
img.src = e.target?.result || ""
}

reader.onerror = function(){
reject(new Error("Failed to read image file"))
}

img.onload = function(){

try{

const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")

const MAX_WIDTH = 1600
const MAX_HEIGHT = 1600

let width = img.width
let height = img.height

if(width > MAX_WIDTH || height > MAX_HEIGHT){
const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
width = Math.round(width * scale)
height = Math.round(height * scale)
}

canvas.width = width
canvas.height = height

ctx.drawImage(img,0,0,width,height)

canvas.toBlob(function(blob){

if(!blob){
reject(new Error("Image compression failed"))
return
}

resolve(blob)

},"image/jpeg",0.9)

}catch(err){
reject(err)
}

}

img.onerror = function(){
reject(new Error("Invalid image"))
}

reader.readAsDataURL(file)

}catch(err){
reject(err)
}

})

}

function normalizeTitleColor(r,g,b){

const brightness = (r * 299 + g * 587 + b * 114) / 1000

if(brightness > 185){
r = Math.max(90, r - 95)
g = Math.max(70, g - 95)
b = Math.max(70, b - 95)
}

if(brightness < 70){
r = Math.min(215, r + 70)
g = Math.min(195, g + 70)
b = Math.min(195, b + 70)
}

return "#" +
((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
.toString(16)
.slice(1)

}

async function extractTitleColor(file){

return new Promise((resolve,reject)=>{

try{

const img = new Image()
const reader = new FileReader()

reader.onload = function(e){
img.src = e.target?.result || ""
}

reader.onerror = function(){
reject(new Error("Failed to read image for color extraction"))
}

img.onload = function(){

try{

const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")

canvas.width = 60
canvas.height = 60

ctx.drawImage(img,0,0,60,60)

const pixels = ctx.getImageData(0,0,60,60).data

let r = 0
let g = 0
let b = 0
let count = 0

for(let i = 0; i < pixels.length; i += 4){
r += pixels[i]
g += pixels[i + 1]
b += pixels[i + 2]
count++
}

if(!count){
resolve("#c78d82")
return
}

r = r / count
g = g / count
b = b / count

resolve(normalizeTitleColor(r,g,b))

}catch(err){
reject(err)
}

}

img.onerror = function(){
reject(new Error("Invalid image for color extraction"))
}

reader.readAsDataURL(file)

}catch(err){
reject(err)
}

})

}

function getStoragePathFromPublicUrl(url){

if(!url) return ""

const marker = "/storage/v1/object/public/proposal-covers/"
const index = url.indexOf(marker)

if(index === -1) return ""

let path = url.slice(index + marker.length)

if(path.includes("?")){
path = path.split("?")[0]
}

return path

}


// =============================
// PROPOSAL COVER STORAGE
// =============================

async function loadExistingProposalBranding(userId){

try{

const supabase = getSupabase()

const { data, error } =
await supabase
.from("photographer_settings")
.select("proposal_cover_image, proposal_title_color")
.eq("user_id", userId)
.maybeSingle()

if(error){
console.error("LOAD PROPOSAL BRANDING ERROR:", error)
return
}

existingProposalCoverImage = data?.proposal_cover_image || ""
existingProposalTitleColor = data?.proposal_title_color || ""

if(existingProposalCoverImage){
setProposalCoverPreviewState(
existingProposalCoverImage,
"Saved image",
true
)
}else{
setProposalCoverPreviewState(
"",
"Default image",
false
)
}

}catch(err){
console.error("LOAD PROPOSAL BRANDING ERROR:", err)
}

}

async function ensurePhotographerSettingsRow(userId){

const supabase = getSupabase()

const { data, error } =
await supabase
.from("photographer_settings")
.select("user_id")
.eq("user_id", userId)
.maybeSingle()

if(error){
throw error
}

if(!data){

const { error: insertError } =
await supabase
.from("photographer_settings")
.insert({
user_id: userId
})

if(insertError){
throw insertError
}

}

}

async function uploadProposalCoverAndSaveBranding(userId){

if(!proposalBrandingAllowed){
selectedProposalCoverFile = null
return {
proposal_cover_image: null,
proposal_title_color: null
}
}

const supabase = getSupabase()

await ensurePhotographerSettingsRow(userId)

if(!selectedProposalCoverFile){

if(!existingProposalCoverImage){
return {
proposal_cover_image: null,
proposal_title_color: null
}
}

return {
proposal_cover_image: existingProposalCoverImage,
proposal_title_color: existingProposalTitleColor || null
}

}

setProposalCoverStatusText("Uploading cover photo...")

const normalizedCoverFile = await normalizeProposalCoverFileForAndroid(selectedProposalCoverFile)

if(isStudioOSNativeQuotationApp() && isLikelyUnsupportedNativeCoverImage(normalizedCoverFile)){
throw new Error("Please select a JPG, JPEG, PNG, or WEBP image for proposal cover.")
}

const compressedBlob = await compressImage(normalizedCoverFile)
const titleColor = await extractTitleColor(normalizedCoverFile)

if(!compressedBlob || !Number(compressedBlob.size || 0)){
throw new Error("Proposal cover image could not be prepared.")
}

// Production safety:
// Upload new cover first, update DB after successful upload, then cleanup old file.
// Never delete the old saved cover before the new upload succeeds.
const previousCoverImage = existingProposalCoverImage || ""
const previousCoverPath = getStoragePathFromPublicUrl(previousCoverImage)

const filePath = `${userId}/proposal-cover-${Date.now()}.jpg`

const uploadBody =
compressedBlob instanceof Blob
? compressedBlob
: new Blob([compressedBlob], { type: "image/jpeg" })

const { error: uploadError } =
await supabase.storage
.from("proposal-covers")
.upload(filePath, uploadBody, {
contentType: "image/jpeg",
cacheControl: "3600",
upsert: true
})

if(uploadError){
setProposalCoverStatusText("Cover photo upload failed. Please try again.")
throw uploadError
}

const { data: publicUrlData } =
supabase.storage
.from("proposal-covers")
.getPublicUrl(filePath)

const publicUrl = publicUrlData?.publicUrl || ""

if(!publicUrl){
setProposalCoverStatusText("Cover photo upload failed. Please try again.")
throw new Error("Proposal cover public URL not created.")
}

const { error: updateError } =
await supabase
.from("photographer_settings")
.update({
proposal_cover_image: publicUrl,
proposal_title_color: titleColor
})
.eq("user_id", userId)

if(updateError){
setProposalCoverStatusText("Cover photo upload failed. Please try again.")
throw updateError
}

existingProposalCoverImage = publicUrl
existingProposalTitleColor = titleColor
selectedProposalCoverFile = null

const input = get("proposalCoverInput")
if(input){
input.value = ""
}

setProposalCoverPreviewState(
existingProposalCoverImage,
"Cover photo successfully changed",
true
)

if(previousCoverPath && previousCoverPath !== filePath){
try{
await supabase.storage
.from("proposal-covers")
.remove([previousCoverPath])
}catch(err){
console.warn("OLD PROPOSAL COVER DELETE SKIPPED:", err)
}
}

return {
proposal_cover_image: existingProposalCoverImage,
proposal_title_color: existingProposalTitleColor
}

}

let proposalCoverImmediateUploadPromise = null

async function uploadSelectedProposalCoverImmediately(){

if(!proposalBrandingAllowed || !selectedProposalCoverFile){
return null
}

if(proposalCoverImmediateUploadPromise){
return await proposalCoverImmediateUploadPromise
}

proposalCoverImmediateUploadPromise = (async function(){

const user = await getCurrentUser()

if(!user?.id){
throw new Error("Login required")
}

const savedBranding = await uploadProposalCoverAndSaveBranding(user.id)

setProposalCoverStatusText("Cover photo successfully changed")

return savedBranding

})()

try{
return await proposalCoverImmediateUploadPromise
}catch(error){
setProposalCoverStatusText("Cover photo upload failed. Please try again.")
throw error
}finally{
proposalCoverImmediateUploadPromise = null
}

}


// =============================
// LOAD QUOTATION FOR EDIT
// =============================

async function loadQuotationForEdit(){

if(!editId) return

const user = await getCurrentUser()
if(!user) return

const supabase = getSupabase()

const { data , error } =
await supabase
.from("quotations")
.select("*")
.eq("id",editId)
.eq("user_id",user.id)
.single()

if(error || !data) return

get("clientName").value = data.client_name || ""
get("clientPhone").value = data.phone || ""

get("startDate").value = data.event_date || ""
get("endDate").value = data.end_date || ""
syncQuotationDateFieldDisplay()

get("packageSelect").value = data.package || ""

if(get("eventCategory")){
get("eventCategory").value = data.event_category || ""
}

get("totalAmount").value = data.total || ""
get("advanceAmount").value = data.advance || ""
get("balanceAmount").value = data.balance || ""


// ===== SERVICES =====

if(data.services){

get("candidQty").value = data.services.candid?.qty || 0
get("candidDays").value = data.services.candid?.days || 0

get("traditionalPhotoQty").value =
data.services.traditional_photo?.qty || 0

get("traditionalPhotoDays").value =
data.services.traditional_photo?.days || 0

get("traditionalVideoQty").value =
data.services.traditional_video?.qty || 0

get("traditionalVideoDays").value =
data.services.traditional_video?.days || 0

get("cinemaQty").value =
data.services.cinematographer?.qty || 0

get("cinemaDays").value =
data.services.cinematographer?.days || 0

get("droneQty").value =
data.services.drone?.qty || 0

get("droneDays").value =
data.services.drone?.days || 0

get("ledQty").value =
data.services.led_wall?.qty || 0

get("ledDays").value =
data.services.led_wall?.days || 0

get("assistantQty").value =
data.services.assistant?.qty || 0

get("assistantDays").value =
data.services.assistant?.days || 0

}


// ===== DELIVERABLES =====

if(data.deliverables){

get("rawCheck").checked = data.deliverables.raw || false
get("traditionalCheck").checked =
data.deliverables.traditional_video || false

get("cinematicCheck").checked =
data.deliverables.cinematic || false

get("albumCheck").checked =
data.deliverables.album?.enabled || false

get("albumPagesInput").value =
data.deliverables.album?.pages || ""

get("giftCheck").checked =
data.deliverables.gift?.enabled || false

get("giftInput").value =
data.deliverables.gift?.name || ""

}

}

loadQuotationForEdit()


// =============================
// PACKAGE PRICE AUTO
// =============================

const packageSelect = get("packageSelect")
const totalInput = get("totalAmount")
const advanceInput = get("advanceAmount")
const balanceInput = get("balanceAmount")

if(packageSelect && totalInput){

packageSelect.addEventListener("change",function(){

totalInput.value = this.value || ""

calculateBalance()

})

}


// =============================
// BALANCE CALCULATION
// =============================

function calculateBalance(){

if(!totalInput || !advanceInput || !balanceInput) return

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}

if(advanceInput){
advanceInput.addEventListener("input",calculateBalance)
}


// =============================
// ALBUM INPUT TOGGLE
// =============================

const albumCheck = get("albumCheck")
const albumPagesInput = get("albumPagesInput")

if(albumCheck && albumPagesInput){

albumCheck.addEventListener("change",function(){

if(this.checked){
albumPagesInput.classList.remove("hidden")
}else{
albumPagesInput.classList.add("hidden")
}

})

}


// =============================
// GIFT INPUT TOGGLE
// =============================

const giftCheck = get("giftCheck")
const giftInput = get("giftInput")

if(giftCheck && giftInput){

giftCheck.addEventListener("change",function(){

if(this.checked){
giftInput.classList.remove("hidden")
}else{
giftInput.classList.add("hidden")
}

})

}


// =============================
// CHECK EVENT LOAD
// =============================

async function checkEventLoad(date,userId){

const supabase = getSupabase()

const { data } =
await supabase
.from("quotations")
.select("event_date")
.eq("user_id",userId)
.eq("event_date",date)
.eq("status","confirmed")

return data?.length || 0

}


// =============================
// AUTO CREATE EVENT
// =============================

async function createEventIfConfirmed(quotation){

try{

if(quotation.status !== "confirmed") return

const supabase = getSupabase()

const uniqueName = "Q_" + quotation.id

const { data: existing } =
await supabase
.from("events")
.select("id")
.eq("event_name", uniqueName)

if(existing && existing.length > 0){
return
}

const { data: insertedEvent, error: insertError } =
await supabase
.from("events")
.insert([{
user_id: quotation.user_id,
client_name: quotation.client_name,
event_name: uniqueName,
event_type: quotation.event_category || "event",
event_date: quotation.event_date,
status: "active"
}])
.select()
.single()

if(insertError){
console.error("Event insert error:", insertError)
return
}

const token =
Math.random().toString(36).substring(2,10).toUpperCase()

await supabase
.from("event_tokens")
.insert([{
event_id: insertedEvent.id,
token: token,
used: false
}])

}catch(err){
console.error("Event create error:",err)
}

}


// =============================
// SAVE / UPDATE QUOTATION
// =============================

async function saveQuotation(data){

try{

const supabase = getSupabase()

if(editId){

const user = await getCurrentUser()

const { error } =
await supabase
.from("quotations")
.update(data)
.eq("id",editId)
.eq("user_id",user.id)

if(error){
console.error(error)
return null
}

await createEventIfConfirmed({ ...data, id: editId, user_id: user.id })

return { id: editId }

}else{

const { data:inserted , error } =
await supabase
.from("quotations")
.insert(data)
.select()
.single()

if(error){
console.error(error)
return null
}

await createEventIfConfirmed(inserted)

return inserted

}

}catch(err){

console.error(err)
return null

}

}


// =============================
// INIT
// =============================

window.addEventListener("DOMContentLoaded", async function(){

injectQuotationAndroidDateLayoutFix()
syncQuotationDateFieldDisplay()

const startDateInput = get("startDate")
const endDateInput = get("endDate")

if(startDateInput){
startDateInput.addEventListener("input", syncQuotationDateFieldDisplay)
startDateInput.addEventListener("change", syncQuotationDateFieldDisplay)
startDateInput.addEventListener("blur", syncQuotationDateFieldDisplay)
}

if(endDateInput){
endDateInput.addEventListener("input", syncQuotationDateFieldDisplay)
endDateInput.addEventListener("change", syncQuotationDateFieldDisplay)
endDateInput.addEventListener("blur", syncQuotationDateFieldDisplay)
}

initProposalCoverUI()
setProposalBrandingSectionVisible(false)

try{

const user = await getCurrentUser()

if(user?.id){
await loadCurrentPlanProfile(user.id)

if(proposalBrandingAllowed){
await loadExistingProposalBranding(user.id)
}else{
selectedProposalCoverFile = null
existingProposalCoverImage = ""
existingProposalTitleColor = ""
setProposalCoverPreviewState(
"",
"Default image",
false
)
}
}

}catch(err){
console.error("INIT PROPOSAL BRANDING ERROR:", err)
proposalBrandingAllowed = false
setProposalBrandingSectionVisible(false)
}

})


// =============================
// PREVIEW QUOTE
// =============================

const previewBtn = get("previewBtn")

if(previewBtn){

previewBtn.addEventListener("click", async function(){

previewBtn.disabled = true
previewBtn.innerText = "Generating..."


// GET USER

const user = await getCurrentUser()

if(!user){

alert("Login required")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}

const supabase = getSupabase()


// VALIDATION

const clientName = get("clientName")?.value.trim() || ""
const clientPhone = get("clientPhone")?.value.trim() || ""
const startDate = get("startDate")?.value || ""

const eventCategory =
get("eventCategory")?.value || ""

if(!clientName){

alert("Enter client name")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}

if(!clientPhone){

alert("Enter client phone")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}

if(!startDate){

alert("Select event date")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}


// SOFT DOUBLE BOOKING WARNING

const existingEvents =
await checkEventLoad(startDate,user.id)

if(existingEvents > 0){

alert(
`⚠ ${existingEvents} event(s) already booked on this date`
)

}


// PROPOSAL BRANDING SAVE

let proposalBranding = proposalBrandingAllowed
? {
proposal_cover_image: existingProposalCoverImage || null,
proposal_title_color: existingProposalTitleColor || null
}
: {
proposal_cover_image: null,
proposal_title_color: null
}

try{
if(proposalCoverImmediateUploadPromise){
await proposalCoverImmediateUploadPromise
}

proposalBranding = await uploadProposalCoverAndSaveBranding(user.id)
}catch(err){
console.error("PROPOSAL BRANDING SAVE ERROR:", err)
alert(err?.message || "Cover photo upload failed. Please try again.")
setQuotationPreviewButtonLoading(false)
return
}


// BUILD SERVICES

const services = {

candid:{
qty: parseInt(get("candidQty")?.value || 0),
days: parseInt(get("candidDays")?.value || 0)
},

traditional_photo:{
qty: parseInt(get("traditionalPhotoQty")?.value || 0),
days: parseInt(get("traditionalPhotoDays")?.value || 0)
},

traditional_video:{
qty: parseInt(get("traditionalVideoQty")?.value || 0),
days: parseInt(get("traditionalVideoDays")?.value || 0)
},

cinematographer:{
qty: parseInt(get("cinemaQty")?.value || 0),
days: parseInt(get("cinemaDays")?.value || 0)
},

drone:{
qty: parseInt(get("droneQty")?.value || 0),
days: parseInt(get("droneDays")?.value || 0)
},

led_wall:{
qty: parseInt(get("ledQty")?.value || 0),
days: parseInt(get("ledDays")?.value || 0)
},

assistant:{
qty: parseInt(get("assistantQty")?.value || 0),
days: parseInt(get("assistantDays")?.value || 0)
}

}


// BUILD DELIVERABLES

const deliverables = {

raw: get("rawCheck")?.checked || false,

traditional_video: get("traditionalCheck")?.checked || false,

cinematic: get("cinematicCheck")?.checked || false,

album:{
enabled: albumCheck?.checked || false,
pages: parseInt(albumPagesInput?.value || 0)
},

gift:{
enabled: giftCheck?.checked || false,
name: giftInput?.value || ""
}

}


// QUOTATION OBJECT

const quotationData = {

user_id: user.id,

client_name: clientName,
phone: clientPhone,

event_category: eventCategory,

event_date: startDate,
end_date: get("endDate")?.value || "",

package: packageSelect?.value || "",

total: parseFloat(totalInput?.value || 0),
advance: parseFloat(advanceInput?.value || 0),
balance: parseFloat(balanceInput?.value || 0),

status: "proposal",

services,
deliverables,

proposal_cover_image: proposalBranding?.proposal_cover_image || null,
proposal_title_color: proposalBranding?.proposal_title_color || null

}


// SAVE

const saved = await saveQuotation(quotationData)

if(!saved || !saved.id){

alert("Error saving quotation")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return
}


// SHORT ID

const shortId = saved.id.substring(0,8)

await supabase
.from("quotations")
.update({ short_id: shortId })
.eq("id", saved.id)


// REDIRECT FIX
// Web keeps public SEO proposal URL.
// Android Capacitor app uses local proposal.html with id/slug query,
// because absolute /studioos/p/... can open a blank WebView screen.

openProposalPreview(clientName, shortId, saved.id)

})

}