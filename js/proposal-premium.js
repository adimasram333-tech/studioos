// ======================
// GET QUOTATION ID (SAME SYSTEM)
// ======================

let quotationId = null

const params = new URLSearchParams(window.location.search)

if(params.get("id")){
quotationId = params.get("id")
}


// ======================
// SUPPORT SLUG
// ======================

let shortId = null

if(params.get("slug")){
const slug = params.get("slug")
if(slug && slug.includes("-")){
const parts = slug.split("-")
shortId = parts[parts.length - 1]
}
}


// ======================
// SUPPORT ROUTE /studioos/p/
// ======================

if(!quotationId && !shortId){

const pathParts = window.location.pathname.split("/").filter(Boolean)
const last = pathParts[pathParts.length - 1]

if(last && last.includes("-")){
const parts = last.split("-")
shortId = parts[parts.length - 1]
}

}


// ======================
// FORMAT HELPERS
// ======================

function formatMoney(num){
return "â‚¹ " + Number(num || 0).toLocaleString("en-IN")
}

function formatDate(dateStr){
if(!dateStr) return "-"
const parts = dateStr.split("-")
if(parts.length !== 3) return dateStr
return parts[2] + "-" + parts[1] + "-" + parts[0]
}


// ======================
// WAIT SUPABASE
// ======================

async function waitForSupabase(){

let tries = 0

while(!window.getSupabase && tries < 50){
await new Promise(r => setTimeout(r,100))
tries++
}

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

return "https://app.chitrabookai.in"

}

function buildPremiumProposalShortLink(data){

if(!data) return getStudioOSPublicBaseUrl() + "/proposal-premium.html"

if(data.id){
return getStudioOSPublicBaseUrl() + "/proposal-premium.html?id=" + encodeURIComponent(data.id)
}

if(data.short_id){
const clientSlug = String(data.client_name || "proposal")
.toLowerCase()
.replace(/[^a-z0-9 ]/g,"")
.replace(/\s+/g,"-")
.replace(/-+/g,"-")
.replace(/^-|-$/g,"") || "proposal"

return getStudioOSPublicBaseUrl() + "/p/" + clientSlug + "-" + data.short_id
}

return getStudioOSPublicBaseUrl() + "/proposal-premium.html"

}

function setPremiumPdfButtonState(isLoading){

const btn = document.querySelector(".premium-btn-pdf")
if(!btn) return

if(isLoading){
btn.disabled = true
btn.dataset.originalText = btn.dataset.originalText || btn.innerText
btn.innerText = "Preparing PDF..."
btn.style.opacity = "0.75"
btn.style.cursor = "not-allowed"
}else{
btn.disabled = false
btn.innerText = btn.dataset.originalText || "Download Proposal PDF"
btn.style.opacity = "1"
btn.style.cursor = "pointer"
}

}



// ======================
// PDF / ANDROID SHARE HELPERS
// ======================

function showPremiumProposalToast(message, type = "error"){

const existingToast = document.getElementById("studioosPremiumProposalToast")
if(existingToast){
existingToast.remove()
}

const toast = document.createElement("div")
toast.id = "studioosPremiumProposalToast"
toast.style.position = "fixed"
toast.style.left = "50%"
toast.style.bottom = "calc(24px + env(safe-area-inset-bottom, 0px))"
toast.style.transform = "translateX(-50%)"
toast.style.width = "min(calc(100% - 32px), 360px)"
toast.style.zIndex = "2147482700"
toast.style.padding = "0.9rem 1rem"
toast.style.borderRadius = "1rem"
toast.style.background = type === "success" ? "rgba(15,23,42,0.96)" : "rgba(127,29,29,0.96)"
toast.style.border = type === "success" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(248,113,113,0.35)"
toast.style.boxShadow = "0 18px 55px rgba(0,0,0,0.38)"
toast.style.backdropFilter = "blur(16px)"
toast.style.webkitBackdropFilter = "blur(16px)"
toast.style.color = "#ffffff"
toast.style.fontSize = "0.88rem"
toast.style.fontWeight = "800"
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
}, 2200)

}

function loadScriptOnce(src, globalCheck){

return new Promise((resolve,reject)=>{

try{

if(typeof globalCheck === "function" && globalCheck()){
resolve()
return
}

const existing = Array.from(document.scripts || []).find(script => script.src === src)

if(existing){

if(existing.dataset.loaded === "true" || (typeof globalCheck === "function" && globalCheck())){
resolve()
return
}

existing.addEventListener("load", ()=>resolve(), { once:true })
existing.addEventListener("error", ()=>reject(new Error("Unable to load PDF library")), { once:true })
return

}

const script = document.createElement("script")
script.src = src
script.async = true
script.dataset.studioosLazy = "true"

script.onload = ()=>{
script.dataset.loaded = "true"
resolve()
}

script.onerror = ()=>{
reject(new Error("Unable to load PDF library"))
}

document.head.appendChild(script)

}catch(error){
reject(error)
}

})

}

async function ensureHtml2PdfLoaded(){

if(typeof window.html2pdf === "function"){
return
}

await loadScriptOnce(
"https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
()=>typeof window.html2pdf === "function"
)

if(typeof window.html2pdf !== "function"){
throw new Error("PDF library not loaded")
}

}

async function waitForDocumentFonts(doc = document){
try{
if(doc?.fonts?.ready){
await doc.fonts.ready
}
}catch(e){
console.log("Document font readiness skipped", e)
}
}

async function waitForImagesInElement(root){

if(!root) return

const images = Array.from(root.querySelectorAll("img") || [])

if(!images.length) return

await Promise.all(images.map((img)=>{
if(img.complete && img.naturalWidth > 0){
return Promise.resolve()
}

return new Promise((resolve)=>{
let done = false

const finish = ()=>{
if(done) return
done = true
resolve()
}

img.addEventListener("load", finish, { once:true })
img.addEventListener("error", finish, { once:true })
setTimeout(finish, 12000)
})
}))

}

function waitForNextPaint(){
return new Promise(resolve=>{
requestAnimationFrame(()=>{
requestAnimationFrame(resolve)
})
})
}

function getStudioOSFileSaverPlugin(){
try{
return window.Capacitor?.Plugins?.StudioOSFileSaver || null
}catch(error){
return null
}
}

function getStudioOSSharePlugin(){
try{
return window.Capacitor?.Plugins?.Share || null
}catch(error){
return null
}
}


function getStudioOSFilesystemPlugin(){
try{
return window.Capacitor?.Plugins?.Filesystem || null
}catch(error){
return null
}
}

function normalizeStudioOSShareFileUri(uri){
const value = String(uri || "").trim()

if(!value){
return ""
}

if(value.startsWith("file://")){
return value
}

if(value.startsWith("/")){
return "file://" + value
}

return ""
}

async function savePremiumProposalPdfBlobForNativeShare(blob, filename){

const fileName = sanitizePremiumProposalPdfFileName(filename)
const base64Data = await blobToBase64ForPremiumProposal(blob)
const Filesystem = getStudioOSFilesystemPlugin()

if(Filesystem && typeof Filesystem.writeFile === "function"){
try{
const result = await Filesystem.writeFile({
path: `studioos-${Date.now()}-${fileName}`,
data: base64Data,
directory: "CACHE",
recursive: true
})

const fileUri = normalizeStudioOSShareFileUri(result?.uri || result?.fileUri || result?.path)

if(fileUri){
return {
fileName,
uri: fileUri
}
}
}catch(error){
console.warn("Filesystem cache premium PDF save failed, trying StudioOSFileSaver fallback:", error)
}
}

const saved = await savePremiumProposalPdfBlobNatively(blob, fileName)
const fileUri = normalizeStudioOSShareFileUri(saved?.uri || saved?.fileUri || saved?.path)

if(!fileUri){
throw new Error("PDF file was created, but Android did not return a shareable file URL.")
}

return {
fileName,
uri: fileUri
}

}

function blobToBase64ForPremiumProposal(blob){

return new Promise((resolve,reject)=>{

const reader = new FileReader()

reader.onloadend = function(){
try{
const result = String(reader.result || "")
const base64 = result.includes(",") ? result.split(",")[1] : result

if(!base64){
reject(new Error("PDF preparation failed"))
return
}

resolve(base64)
}catch(error){
reject(error)
}
}

reader.onerror = function(){
reject(new Error("Unable to read PDF file"))
}

reader.readAsDataURL(blob)

})

}

function sanitizePremiumProposalPdfFileName(value){

const safe = String(value || "premium-proposal.pdf")
.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
.replace(/\s+/g, "-")
.replace(/-+/g, "-")
.replace(/^-|-$/g, "")
.toLowerCase()

return safe.endsWith(".pdf") ? safe : safe + ".pdf"

}

async function savePremiumProposalPdfBlobNatively(blob, filename){

const saver = getStudioOSFileSaverPlugin()

if(!saver || typeof saver.saveFile !== "function"){
throw new Error("StudioOS native file saver is not available")
}

const fileName = sanitizePremiumProposalPdfFileName(filename)
const base64Data = await blobToBase64ForPremiumProposal(blob)

const result = await saver.saveFile({
base64Data,
fileName,
mimeType: "application/pdf",
target: "downloads"
})

return {
fileName,
uri: result?.uri || ""
}

}

function buildPremiumProposalShareMessage(data, profile){

return `Hello ${data?.client_name || ""},

Your premium photography proposal is attached as PDF.

${profile?.studio_name || ""}
${profile?.phone || ""}

Powered by StudioOS`

}

function buildPremiumProposalTextShareMessage(data, profile){

return `Hello ${data?.client_name || ""},

Your premium photography proposal is attached as PDF.

${profile?.studio_name || ""}
${profile?.phone || ""}

Powered by StudioOS`

}

async function sharePremiumProposalTextNatively(data, profile){

const Share = getStudioOSSharePlugin()

if(!Share || typeof Share.share !== "function"){
throw new Error("Native Share plugin is not available")
}

await Share.share({
title: "StudioOS Premium Proposal",
text: buildPremiumProposalTextShareMessage(data, profile),
dialogTitle: "Share Premium Proposal"
})

return true

}

async function generatePremiumProposalPdfBlob(){

await ensureHtml2PdfLoaded()
await waitForDocumentFonts(document)

const element = document.getElementById("proposalPage") || document.body

await waitForImagesInElement(element)
await waitForNextPaint()

const opt = {
margin:0,
filename:"premium-proposal.pdf",
image:{ type:"jpeg", quality:1 },
html2canvas:{
scale:2,
useCORS:true,
allowTaint:false,
backgroundColor:"#0f172a",
scrollX:0,
scrollY:0,
logging:false
},
jsPDF:{ unit:"mm", format:[210,297], orientation:"portrait" }
}

return await html2pdf()
.set(opt)
.from(element)
.outputPdf("blob")

}

async function sharePremiumProposalPdfNatively(data, profile){

const saver = getStudioOSFileSaverPlugin()

if(!saver || typeof saver.shareFile !== "function"){
throw new Error("Native PDF share is not available")
}

const fileName = sanitizePremiumProposalPdfFileName("premium-proposal.pdf")
const pdfBlob = await generatePremiumProposalPdfBlob()
const base64Data = await blobToBase64ForPremiumProposal(pdfBlob)

// Android production root fix:
// Do not use Capacitor Share files[] here. Capacitor Share rejects
// content:// URIs with "only file urls are supported". The native
// StudioOSFileSaverPlugin.shareFile() writes the PDF into app cache
// and opens Android ACTION_SEND using FileProvider, which is the correct
// WhatsApp attachment flow for Android.
await saver.shareFile({
base64Data,
fileName,
mimeType: "application/pdf",
text: buildPremiumProposalShareMessage(data, profile),
title: "Send Premium Proposal on WhatsApp"
})

return true

}



// ======================
// PREMIUM PLAN GATE
// ======================

function normalizePlanValue(value){
return String(value || "").trim().toLowerCase()
}

function isActivePremiumProposalPlan(profile){
if(!profile) return false

const plan = normalizePlanValue(profile.plan)
const status = normalizePlanValue(profile.subscription_status)
const isPaid = profile.is_paid === true
const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0
const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now()

return isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro")
}

async function isCurrentViewerOwner(supabase, ownerId){
try{
const { data } = await supabase.auth.getUser()
const currentUserId = data?.user?.id || ""
return !!currentUserId && String(currentUserId) === String(ownerId)
}catch(e){
return false
}
}

function renderPremiumProposalLocked(isOwner = false){
const actionHtml = isOwner
? `
  <button onclick="window.location.href='subscription.html'" style="
    margin-top:18px;
    padding:12px 18px;
    border:none;
    border-radius:14px;
    background:#4f46e5;
    color:white;
    font-weight:700;
    cursor:pointer;
  ">View Plans</button>
`
: ""

document.body.innerHTML = `
  <div style="
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:radial-gradient(circle at top, #1e293b, #0f172a);
    color:white;
    font-family:Inter, sans-serif;
    text-align:center;
  ">
    <div style="
      width:min(100%, 420px);
      border-radius:24px;
      padding:24px;
      background:rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.12);
      box-shadow:0 24px 60px rgba(0,0,0,0.35);
    ">
      <div style="
        display:inline-flex;
        padding:6px 12px;
        border-radius:999px;
        background:rgba(79,70,229,0.18);
        color:#c7d2fe;
        font-size:12px;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
      ">Premium Feature</div>

      <h2 style="margin:16px 0 8px; font-size:24px; line-height:1.25;">
        Premium proposal is locked
      </h2>

      <p style="margin:0; color:rgba(255,255,255,0.72); line-height:1.65; font-size:14px;">
        Premium proposals are available on Basic and Pro plans.
      </p>

      ${actionHtml}
    </div>
  </div>
`
}


// ======================
// LOAD PROPOSAL
// ======================

async function loadPremiumProposal(){

await waitForSupabase()

const supabase = await window.getSupabase()

let data = null


// ======================
// LOAD QUOTATION
// ======================

if(quotationId){

const { data: row } = await supabase
.from("quotations")
.select("*")
.eq("id", quotationId)
.maybeSingle()

if(row){
data = row
}

}

if(!data && shortId){

const { data: row } = await supabase
.from("quotations")
.select("*")
.eq("short_id", shortId)
.maybeSingle()

if(row){
data = row
quotationId = row.id
}

}

if(!data){
document.body.innerHTML = "<h2 style='text-align:center;margin-top:40px'>Proposal not found</h2>"
return
}


// ======================
// LOAD PROFILE
// ======================

let profile = null

try{
const { data: row } = await supabase
.from("photographer_settings")
.select("*")
.eq("user_id", data.user_id)
.maybeSingle()

if(row){
profile = row
}
}catch(e){
console.log(e)
}

const premiumAllowed = isActivePremiumProposalPlan(profile)

if(!premiumAllowed){
const viewerIsOwner = await isCurrentViewerOwner(supabase, data.user_id)
renderPremiumProposalLocked(viewerIsOwner)
return
}


// ======================
// APPLY COVER IMAGE
// ======================

const cover = document.getElementById("coverImage")

const proposalCoverImage =
data?.proposal_cover_image ||
profile?.proposal_cover_image ||
profile?.team_sheet_cover_image ||
""

if(proposalCoverImage){
cover.src = proposalCoverImage
}


// ======================
// APPLY TITLE COLOR
// ======================

const title = document.getElementById("proposalTitle")

const proposalTitleColor =
data?.proposal_title_color ||
profile?.proposal_title_color ||
profile?.team_sheet_title_color ||
""

if(proposalTitleColor){
title.style.color = proposalTitleColor
}


// ======================
// STUDIO INFO
// ======================

document.getElementById("studioName").innerText =
profile?.studio_name || ""

document.getElementById("studioPhone").innerText =
profile?.phone || ""


// ======================
// TITLE
// ======================

let category = data.event_category || "Photography"
title.innerText = category + " Proposal"


// ======================
// CLIENT INFO
// ======================

document.getElementById("clientName").innerText =
data.client_name || ""


// ======================
// DATE
// ======================

let eventDateText = "-"

if(data.event_date && data.end_date){
eventDateText =
formatDate(data.event_date) +
" â†’ " +
formatDate(data.end_date)
}else{
eventDateText = formatDate(data.event_date)
}

document.getElementById("eventDate").innerText =
eventDateText


// ======================
// SERVICES
// ======================

let services = data.services || {}

if(typeof services === "string"){
try{
services = JSON.parse(services)
}catch(e){
services = {}
}
}

function set(id,val){
const el = document.getElementById(id)
if(el) el.innerText = val
}

set("candidQty",
(services.candid?.qty || 0) + " x " + (services.candid?.days || 0))

set("traditionalPhotoQty",
(services.traditional_photo?.qty || 0) + " x " + (services.traditional_photo?.days || 0))

set("traditionalVideoQty",
(services.traditional_video?.qty || 0) + " x " + (services.traditional_video?.days || 0))

set("cinemaQty",
(services.cinematographer?.qty || 0) + " x " + (services.cinematographer?.days || 0))

set("droneQty",
(services.drone?.qty || 0) + " x " + (services.drone?.days || 0))

set("ledQty",
(services.led_wall?.qty || 0) + " x " + (services.led_wall?.days || 0))

set("assistantQty",
(services.assistant?.qty || 0) + " x " + (services.assistant?.days || 0))


// ======================
// DELIVERABLES
// ======================

let deliverables = data.deliverables || {}

if(typeof deliverables === "string"){
try{
deliverables = JSON.parse(deliverables)
}catch(e){
deliverables = {}
}
}

const list = document.getElementById("deliverablesList")

if(list){

list.innerHTML = ""

if(deliverables.raw)
list.innerHTML += "<li>All Raw Soft Copy</li>"

if(deliverables.traditional_video)
list.innerHTML += "<li>Traditional Full Video</li>"

if(deliverables.cinematic)
list.innerHTML += "<li>Cinematic Film</li>"

if(deliverables.album?.enabled)
list.innerHTML += "<li>Album (" + (deliverables.album.pages || 0) + " Pages)</li>"

if(deliverables.gift?.enabled)
list.innerHTML += "<li>Gift: " + (deliverables.gift.name || "") + "</li>"

}


// ======================
// MONEY
// ======================

document.getElementById("total").innerText =
formatMoney(data.total)

document.getElementById("advance").innerText =
formatMoney(data.advance)

document.getElementById("balance").innerText =
formatMoney(data.balance)


// ======================
// WHATSAPP
// ======================

window.sendWhatsApp = async function(){

setPremiumPdfButtonState(true)

try{

if(isStudioOSNativeApp()){
await sharePremiumProposalPdfNatively(data, profile)
showPremiumProposalToast("Share sheet opened", "success")
return
}

showPremiumProposalToast("PDF is being prepared. Please attach the downloaded PDF in WhatsApp.", "success")

const pdfBlob = await generatePremiumProposalPdfBlob()
const url = URL.createObjectURL(pdfBlob)
const link = document.createElement("a")
link.href = url
link.download = "premium-proposal.pdf"
document.body.appendChild(link)
link.click()
link.remove()

setTimeout(function(){
URL.revokeObjectURL(url)
}, 30000)

}catch(error){
console.error("PREMIUM PROPOSAL SHARE ERROR:", error)
showPremiumProposalToast(error?.message || "Premium proposal share failed", "error")
}finally{
setPremiumPdfButtonState(false)
}

}

// ======================
// PDF
// ======================

window.downloadPDF = async function(){

setPremiumPdfButtonState(true)

try{

await ensureHtml2PdfLoaded()
await waitForDocumentFonts(document)

const element = document.getElementById("proposalPage") || document.body

await waitForImagesInElement(element)
await waitForNextPaint()

const opt = {
margin:0,
filename:"premium-proposal.pdf",
image:{ type:"jpeg", quality:1 },
html2canvas:{
scale:2,
useCORS:true,
allowTaint:false,
backgroundColor:"#0f172a",
scrollX:0,
scrollY:0,
logging:false
},
jsPDF:{ unit:"mm", format:[210,297], orientation:"portrait" }
}

if(isStudioOSNativeApp()){
const pdfBlob = await html2pdf()
.set(opt)
.from(element)
.outputPdf("blob")

await savePremiumProposalPdfBlobNatively(pdfBlob, "premium-proposal.pdf")
showPremiumProposalToast("PDF saved to Downloads", "success")
return
}

await html2pdf().set(opt).from(element).save()

}catch(error){

console.error("PREMIUM PDF DOWNLOAD ERROR:", error)
showPremiumProposalToast(error?.message || "PDF download failed", "error")

}finally{

setPremiumPdfButtonState(false)

}

}

}

window.addEventListener("load", loadPremiumProposal)
