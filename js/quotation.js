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


// =============================
// EDIT MODE DETECTION
// =============================

let editId = null
let selectedProposalCoverFile = null
let existingProposalCoverImage = ""
let existingProposalTitleColor = ""

function getQueryParam(name){
const url = new URL(window.location.href)
return url.searchParams.get(name)
}

editId = getQueryParam("edit")


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
input.click()
})
}

if(input){

input.addEventListener("change",function(e){

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

selectedProposalCoverFile = file

const reader = new FileReader()

reader.onload = function(evt){
setProposalCoverPreviewState(
evt.target?.result || "",
"Custom image selected",
true
)
}

reader.readAsDataURL(file)

})

}

if(removeBtn){

removeBtn.addEventListener("click",function(){

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

const compressedBlob = await compressImage(selectedProposalCoverFile)
const titleColor = await extractTitleColor(selectedProposalCoverFile)

if(existingProposalCoverImage){

try{

const oldPath = getStoragePathFromPublicUrl(existingProposalCoverImage)

if(oldPath){
await supabase.storage
.from("proposal-covers")
.remove([oldPath])
}

}catch(err){
console.error("OLD PROPOSAL COVER DELETE ERROR:", err)
}

}

const filePath = `${userId}/proposal-cover.jpg`

const { error: uploadError } =
await supabase.storage
.from("proposal-covers")
.upload(filePath, compressedBlob, {
contentType: "image/jpeg",
upsert: true
})

if(uploadError){
throw uploadError
}

const { data: publicUrlData } =
supabase.storage
.from("proposal-covers")
.getPublicUrl(filePath)

const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

const { error: updateError } =
await supabase
.from("photographer_settings")
.update({
proposal_cover_image: publicUrl,
proposal_title_color: titleColor
})
.eq("user_id", userId)

if(updateError){
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
"Saved image",
true
)

return {
proposal_cover_image: existingProposalCoverImage,
proposal_title_color: existingProposalTitleColor
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

initProposalCoverUI()

try{

const user = await getCurrentUser()

if(user?.id){
await loadExistingProposalBranding(user.id)
}

}catch(err){
console.error("INIT PROPOSAL BRANDING ERROR:", err)
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

let proposalBranding = {
proposal_cover_image: existingProposalCoverImage || null,
proposal_title_color: existingProposalTitleColor || null
}

try{
proposalBranding = await uploadProposalCoverAndSaveBranding(user.id)
}catch(err){
console.error("PROPOSAL BRANDING SAVE ERROR:", err)
alert("Proposal cover upload failed")
previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"
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

const slug = slugify(clientName)

window.location.href =
"/studioos/p/" + slug + "-" + shortId

})

}