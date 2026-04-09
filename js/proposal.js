// ======================
// GET QUOTATION ID
// ======================

let quotationId = null

const params = new URLSearchParams(window.location.search)

if(params.get("id")){
quotationId = params.get("id")
}


// ======================
// SUPPORT SLUG QUERY
// ======================

let shortId = null

if(params.get("slug")){

const slug = params.get("slug")

if(slug && slug.includes("-")){
const slugParts = slug.split("-")
shortId = slugParts[slugParts.length - 1]
}

}


// ======================
// SUPPORT SEO LINK
// ======================

if(!quotationId && !shortId){

const pathParts = window.location.pathname.split("/").filter(Boolean)

const lastPart = pathParts[pathParts.length - 1]

if(lastPart && lastPart.includes("-")){

const slugParts = lastPart.split("-")
shortId = slugParts[slugParts.length - 1]

}

}


// ======================
// SHARED PROPOSAL STATE
// ======================

let activeProposalData = null
let activeProposalProfile = null
let pdfExportScrollTop = 0


// ======================
// FORMAT MONEY
// ======================

function formatMoney(num){
return "₹ " + Number(num || 0).toLocaleString("en-IN") + "/-"
}


// ======================
// FORMAT DATE
// ======================

function formatDate(dateStr){

if(!dateStr) return "-"

const parts = dateStr.split("-")

if(parts.length !== 3) return dateStr

return parts[2] + "-" + parts[1] + "-" + parts[0]

}


// ======================
// WAIT FOR SUPABASE
// ======================

async function waitForSupabase(){

let tries = 0

while(!window.getSupabase && tries < 50){
await new Promise(r => setTimeout(r,100))
tries++
}

}


// ======================
// PLAN CHECK
// ======================

function isPremiumUser(profile){
return (
profile?.plan === "pro" ||
profile?.plan === "paid" ||
profile?.subscription === "pro" ||
profile?.subscription === "paid" ||
profile?.is_pro === true ||
profile?.is_paid === true
)
}


// ======================
// HERO TITLE TEXT
// ======================

function getProposalTitle(data){
let category = data?.event_category || "Photography"
return category + " Photography Proposal"
}


// ======================
// EVENT DATE TEXT
// ======================

function getEventDateText(data){

if(data?.event_date && data?.end_date){
return formatDate(data.event_date) + " → " + formatDate(data.end_date)
}

return formatDate(data?.event_date)

}


// ======================
// PARSE SERVICES
// ======================

function parseServices(services){

let parsed = services || {}

if(typeof parsed === "string"){
try{
parsed = JSON.parse(parsed)
}catch(e){
parsed = {}
}
}

return parsed

}


// ======================
// PARSE DELIVERABLES
// ======================

function parseDeliverables(deliverables){

let parsed = deliverables || {}

if(typeof parsed === "string"){
try{
parsed = JSON.parse(parsed)
}catch(e){
parsed = {}
}
}

return parsed

}


// ======================
// SAFE HTML
// ======================

function escapeHtml(value){
return String(value || "")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;")
}


// ======================
// LOADING STATE HELPERS
// ======================

function finishProposalLoading(){
document.body.classList.remove("proposal-loading")
}

function showProposalUnavailable(message){

const page = document.getElementById("proposalPage")

if(page){
page.innerHTML = `
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:#f4f4f4;">
  <div style="width:min(100%,520px);background:#ffffff;border-radius:20px;padding:28px 24px;box-shadow:0 14px 40px rgba(0,0,0,0.08);text-align:center;">
    <h2 style="margin:0 0 10px 0;font-family:'Playfair Display',serif;font-size:32px;color:#2f2823;">Proposal not available</h2>
    <p style="margin:0;color:#7b7268;line-height:1.7;font-size:15px;">${escapeHtml(message || "Unable to load this proposal right now.")}</p>
  </div>
</div>
`
}

finishProposalLoading()

}


// ======================
// GET BRANDING VALUES
// ======================

function getProposalCoverImage(data,profile){
return (
data?.proposal_cover_image ||
profile?.proposal_cover_image ||
profile?.team_sheet_cover_image ||
"https://images.unsplash.com/photo-1519741497674-611481863552"
)
}

function getProposalAccentColor(data,profile){
return (
data?.proposal_title_color ||
profile?.proposal_title_color ||
profile?.team_sheet_title_color ||
"#c78d82"
)
}


// ======================
// PREMIUM SERVICES HTML
// ======================

function buildPremiumServicesHtml(services){

const serviceMap = [
{ key:"candid", label:"Candid Photographer" },
{ key:"traditional_photo", label:"Traditional Photographer" },
{ key:"traditional_video", label:"Traditional Videographer" },
{ key:"cinematographer", label:"Cinematographer" },
{ key:"drone", label:"Drone Operator" },
{ key:"led_wall", label:"LED Screen Wall" },
{ key:"assistant", label:"Assistant" }
]

return serviceMap.map((item) => {
const row = services[item.key] || {}
const qty = row.qty || 0
const days = row.days || 0

return `
<div class="proposal-premium-service-row">
  <span>${escapeHtml(item.label)}</span>
  <span>${qty} x ${days} Days</span>
</div>
`
}).join("")

}


// ======================
// PREMIUM DELIVERABLES HTML
// ======================

function buildPremiumDeliverablesHtml(deliverables){

let html = ""

if(deliverables.raw){
html += `<li>All Raw Soft Copy</li>`
}

if(deliverables.traditional_video){
html += `<li>Traditional Full Event Video</li>`
}

if(deliverables.cinematic){
html += `<li>Cinematic Highlight Film</li>`
}

if(deliverables.album?.enabled){
html += `<li>Premium Printed Album (${deliverables.album.pages || 0} Pages)</li>`
}

if(deliverables.gift?.enabled){
html += `<li>Complimentary Gift : ${escapeHtml(deliverables.gift.name || "-")}</li>`
}

if(!html){
html = `<li>Deliverables will be shared as per final package confirmation.</li>`
}

return html

}


// ======================
// PDF HELPERS
// ======================

function isHtml2PdfReady(){
return typeof window.html2pdf !== "undefined"
}

function isPremiumProposalRendered(){
return !!document.querySelector("#proposalPage .proposal-premium-page")
}

function getPdfExportTarget(){
return document.getElementById("proposalPage")
}

function setDownloadButtonState(isLoading){

const btn = document.getElementById("proposalDownloadPdfBtn")
if(!btn) return

if(isLoading){
btn.disabled = true
btn.dataset.originalText = btn.dataset.originalText || btn.innerText
btn.innerText = "Preparing PDF..."
btn.style.opacity = "0.75"
btn.style.cursor = "not-allowed"
}else{
btn.disabled = false
btn.innerText = btn.dataset.originalText || "Download PDF"
btn.style.opacity = "1"
btn.style.cursor = "pointer"
}

}

function injectPdfExportStyles(){

if(document.getElementById("proposal-pdf-export-styles")) return

const style = document.createElement("style")
style.id = "proposal-pdf-export-styles"
style.innerHTML = `
body.proposal-pdf-export-mode{
background:#ffffff !important;
overflow:visible !important;
}
body.proposal-pdf-export-mode #proposalLoadingOverlay{
display:none !important;
}
body.proposal-pdf-export-mode #proposalPage{
width:794px !important;
max-width:794px !important;
min-width:794px !important;
margin:0 auto !important;
background:#ffffff !important;
overflow:visible !important;
box-shadow:none !important;
}
body.proposal-pdf-export-mode .whatsappBox,
body.proposal-pdf-export-mode .proposal-premium-actions{
display:none !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root{
margin:0 auto !important;
background:#ffffff !important;
box-shadow:none !important;
border-radius:0 !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-shell{
width:794px !important;
max-width:794px !important;
min-width:794px !important;
padding:0 !important;
margin:0 !important;
min-height:auto !important;
background:#ffffff !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-page{
width:794px !important;
max-width:794px !important;
min-width:794px !important;
margin:0 !important;
min-height:auto !important;
border-radius:0 !important;
box-shadow:none !important;
overflow:hidden !important;
display:grid !important;
grid-template-columns:318px 476px !important;
background:#f6f1ea !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-image-column{
min-height:100% !important;
height:auto !important;
background:#d7cdc2 !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-image{
display:block !important;
width:100% !important;
height:100% !important;
min-height:100% !important;
max-height:none !important;
object-fit:cover !important;
object-position:center !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-image-overlay{
display:block !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-content{
padding:28px 24px 22px !important;
display:flex !important;
flex-direction:column !important;
box-sizing:border-box !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-title{
font-size:34px !important;
line-height:1.12 !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-studio{
font-size:22px !important;
margin-top:16px !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-phone{
font-size:13px !important;
margin-top:6px !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-meta{
grid-template-columns:1fr !important;
padding:14px 16px !important;
gap:10px !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-meta-item{
flex-direction:row !important;
align-items:center !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-row-grid{
grid-template-columns:1fr 1fr !important;
gap:14px !important;
margin-top:14px !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-section,
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-meta{
background:#ffffff !important;
box-shadow:none !important;
break-inside:avoid !important;
page-break-inside:avoid !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-section{
padding:16px !important;
margin-top:14px !important;
border-radius:18px !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-section-title{
font-size:24px !important;
margin-bottom:10px !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-service-row,
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-summary-row{
font-size:13px !important;
padding:10px 0 !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-summary-row strong:first-child,
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-summary-row strong:last-child{
font-size:13px !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-list,
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-copy{
font-size:13px !important;
line-height:1.7 !important;
}
body.proposal-pdf-export-mode #proposalPage.proposal-premium-root .proposal-premium-footer{
margin-top:10px !important;
font-size:11px !important;
}
`
document.head.appendChild(style)

}

function waitForNextPaint(){
return new Promise((resolve) => {
requestAnimationFrame(() => {
requestAnimationFrame(resolve)
})
})
}

async function waitForFonts(){
if(document.fonts && document.fonts.ready){
try{
await document.fonts.ready
}catch(e){
console.log("Font readiness skipped", e)
}
}
}

async function waitForImagesInElement(element){

if(!element) return

const images = Array.from(element.querySelectorAll("img"))

if(!images.length) return

await Promise.all(images.map((img) => {
if(img.complete && img.naturalWidth > 0){
return Promise.resolve()
}

return new Promise((resolve) => {
let done = false

const finish = () => {
if(done) return
done = true
resolve()
}

img.addEventListener("load", finish, { once:true })
img.addEventListener("error", finish, { once:true })

setTimeout(finish, 8000)
})
}))

}

async function setPdfExportMode(enabled){

injectPdfExportStyles()

if(enabled){
pdfExportScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
document.body.classList.add("proposal-pdf-export-mode")
window.scrollTo(0,0)
await waitForNextPaint()
await waitForNextPaint()
return
}

document.body.classList.remove("proposal-pdf-export-mode")
await waitForNextPaint()
window.scrollTo(0,pdfExportScrollTop)

}

async function downloadProposalPdf(){

if(!isHtml2PdfReady()){
alert("PDF library not loaded")
return
}

setDownloadButtonState(true)

try{

await setPdfExportMode(true)

const exportTarget = getPdfExportTarget()

if(!exportTarget){
throw new Error("Proposal export target not found")
}

await waitForFonts()
await waitForImagesInElement(exportTarget)
await waitForNextPaint()
await waitForNextPaint()

const targetWidth = 794
const targetHeight = exportTarget.scrollHeight || exportTarget.offsetHeight || 1123

const opt = {
margin:[0,0,0,0],
filename:"photography-proposal.pdf",
image:{ type:"jpeg", quality:0.98 },
html2canvas:{
scale:2,
useCORS:true,
allowTaint:false,
scrollX:0,
scrollY:0,
windowWidth:targetWidth,
windowHeight:targetHeight,
width:targetWidth,
height:targetHeight,
backgroundColor:"#ffffff",
logging:false
},
jsPDF:{
unit:"px",
format:[794, 1123],
orientation:"portrait"
},
pagebreak:{
mode:["css","legacy"]
}
}

await window.html2pdf().set(opt).from(exportTarget).save()

}catch(err){
console.error("PDF DOWNLOAD ERROR:",err)
alert("PDF download failed")
}finally{
await setPdfExportMode(false)
setDownloadButtonState(false)
}

}


// ======================
// GLOBAL ACTION HELPERS
// ======================

function buildProposalShortLink(data){

if(!data) return window.location.href

let clientSlug =
(data.client_name || "")
.toLowerCase()
.replace(/[^a-z0-9 ]/g,"")
.replace(/\s+/g,"-")
.replace(/-+/g,"-")
.replace(/^-|-$/g,"")

if(!clientSlug){
clientSlug = "proposal"
}

if(data.short_id){
return window.location.origin + "/studioos/p/" + clientSlug + "-" + data.short_id
}

if(data.id){
return window.location.origin + "/studioos/proposal.html?id=" + data.id
}

return window.location.href

}

function buildWhatsAppLink(data, profile){

const phone = String(data?.phone || "").replace(/\D/g,"")

if(!phone){
return null
}

const normalizedPhone = phone.length === 10 ? "91" + phone : phone

const shortLink = buildProposalShortLink(data)

const message =
`Hello ${data.client_name || ""},

Your photography proposal is ready.

View your proposal:
${shortLink}

For booking contact:

${profile?.studio_name || ""}
Phone: ${profile?.phone || ""}

Powered by StudioOS`

return "https://wa.me/" + normalizedPhone + "?text=" + encodeURIComponent(message)

}


// ======================
// GLOBAL BUTTON ACTIONS
// ======================

window.sendWhatsApp = function(){

if(!activeProposalData){
alert("Proposal data not available")
return
}

const url = buildWhatsAppLink(activeProposalData, activeProposalProfile)

if(!url){
alert("Client phone number not available")
return
}

window.open(url,"_blank")

}

window.sendProposalOnWhatsApp = window.sendWhatsApp

window.downloadPDF = async function(){
await downloadProposalPdf()
}


// ======================
// INJECT PREMIUM STYLES
// ======================

function injectPremiumStyles(){

if(document.getElementById("proposal-premium-styles")) return

const style = document.createElement("style")
style.id = "proposal-premium-styles"
style.innerHTML = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

:root{
--proposal-premium-bg:#d9d2ca;
--proposal-premium-paper:#f6f1ea;
--proposal-premium-card:#fdfbf8;
--proposal-premium-border:#e5d9cd;
--proposal-premium-text:#2f2823;
--proposal-premium-muted:#7b7268;
--proposal-premium-soft:#a09487;
--proposal-premium-shadow:0 24px 64px rgba(46,34,28,0.14);
--proposal-premium-dark:#1f1a17;
}
html,
body{
margin:0;
padding:0;
}
body{
background:var(--proposal-premium-bg);
font-family:'Inter',sans-serif;
color:var(--proposal-premium-text);
-webkit-print-color-adjust:exact;
print-color-adjust:exact;
}
#proposalPage.proposal-premium-root{
width:100%;
max-width:1360px;
margin:18px auto;
background:transparent;
box-shadow:none;
overflow:visible;
}
.proposal-premium-shell{
min-height:auto;
background:var(--proposal-premium-bg);
padding:18px;
box-sizing:border-box;
}
.proposal-premium-page{
max-width:1360px;
margin:0 auto;
background:var(--proposal-premium-paper);
border-radius:34px;
overflow:hidden;
box-shadow:var(--proposal-premium-shadow);
display:grid;
grid-template-columns:46% 54%;
min-height:calc(100vh - 36px);
}
.proposal-premium-image-column{
position:relative;
background:#d7cdc2;
min-height:100%;
}
.proposal-premium-image{
display:block;
width:100%;
height:100%;
object-fit:cover;
object-position:center;
}
.proposal-premium-image-overlay{
position:absolute;
inset:0;
pointer-events:none;
background:linear-gradient(to bottom,rgba(0,0,0,0.02),rgba(0,0,0,0.06));
}
.proposal-premium-content{
padding:40px 38px 26px;
display:flex;
flex-direction:column;
box-sizing:border-box;
}
.proposal-premium-header{
text-align:center;
}
.proposal-premium-title{
margin:0;
font-family:'Playfair Display',serif;
font-size:56px;
font-weight:600;
line-height:1.08;
letter-spacing:0.01em;
word-break:break-word;
}
.proposal-premium-studio{
margin-top:24px;
font-family:'Playfair Display',serif;
font-size:29px;
line-height:1.2;
color:var(--proposal-premium-text);
word-break:break-word;
}
.proposal-premium-phone{
margin-top:8px;
font-size:16px;
color:var(--proposal-premium-muted);
word-break:break-word;
}
.proposal-premium-meta{
margin-top:28px;
padding:18px 20px;
border-radius:22px;
background:rgba(255,255,255,0.76);
border:1px solid var(--proposal-premium-border);
display:grid;
grid-template-columns:1fr 1fr;
gap:12px 18px;
}
.proposal-premium-meta-item{
display:flex;
justify-content:space-between;
gap:14px;
font-size:14px;
line-height:1.45;
}
.proposal-premium-meta-item span:first-child{
color:var(--proposal-premium-muted);
}
.proposal-premium-row-grid{
display:grid;
grid-template-columns:1.12fr 0.88fr;
gap:18px;
margin-top:18px;
}
.proposal-premium-section{
margin-top:18px;
padding:22px;
background:rgba(255,255,255,0.78);
border:1px solid var(--proposal-premium-border);
border-radius:24px;
box-sizing:border-box;
}
.proposal-premium-section-title{
margin:0 0 14px 0;
font-family:'Playfair Display',serif;
font-size:30px;
font-weight:600;
line-height:1.12;
color:var(--proposal-premium-text);
}
.proposal-premium-service-row{
display:flex;
justify-content:space-between;
gap:18px;
padding:12px 0;
border-bottom:1px solid var(--proposal-premium-border);
font-size:15px;
line-height:1.45;
}
.proposal-premium-service-row:last-child{
border-bottom:none;
}
.proposal-premium-service-row span:first-child{
color:var(--proposal-premium-muted);
}
.proposal-premium-service-row span:last-child{
text-align:right;
font-weight:500;
color:var(--proposal-premium-text);
}
.proposal-premium-summary-row{
display:flex;
justify-content:space-between;
align-items:flex-start;
gap:16px;
padding:12px 0;
border-bottom:1px solid var(--proposal-premium-border);
font-size:14px;
line-height:1.45;
}
.proposal-premium-summary-row:last-child{
border-bottom:none;
}
.proposal-premium-summary-row strong:first-child{
font-weight:600;
font-size:14px;
color:var(--proposal-premium-text);
}
.proposal-premium-summary-row strong:last-child{
font-weight:600;
font-size:14px;
text-align:right;
color:var(--proposal-premium-text);
}
.proposal-premium-list{
margin:0;
padding-left:20px;
line-height:1.9;
color:var(--proposal-premium-muted);
font-size:15px;
}
.proposal-premium-copy{
color:var(--proposal-premium-muted);
font-size:15px;
line-height:1.85;
}
.proposal-premium-copy ul{
margin:10px 0 0;
padding-left:20px;
}
.proposal-premium-actions{
margin-top:22px;
display:grid;
grid-template-columns:1fr 1fr;
gap:14px;
}
.proposal-premium-btn{
border:none;
border-radius:16px;
padding:16px 18px;
font-size:15px;
font-weight:600;
cursor:pointer;
transition:.2s ease;
font-family:'Inter',sans-serif;
}
.proposal-premium-btn:disabled{
opacity:.75;
cursor:not-allowed;
}
.proposal-premium-btn-whatsapp{
background:#25D366;
color:#ffffff;
}
.proposal-premium-btn-whatsapp:hover{
opacity:.92;
}
.proposal-premium-btn-pdf{
background:var(--proposal-premium-dark);
color:#ffffff;
}
.proposal-premium-btn-pdf:hover{
opacity:.92;
}
.proposal-premium-footer{
margin-top:16px;
text-align:center;
font-size:12px;
line-height:1.7;
color:var(--proposal-premium-soft);
}
.proposal-premium-footer p{
margin:0;
}
.proposal-premium-footer p + p{
margin-top:4px;
}
@media (max-width: 1200px){
.proposal-premium-title{
font-size:50px;
}
.proposal-premium-studio{
font-size:27px;
}
}
@media (max-width: 1024px){
#proposalPage.proposal-premium-root{
max-width:100%;
margin:0 auto;
}
.proposal-premium-page{
grid-template-columns:1fr;
}
.proposal-premium-image-column{
min-height:460px;
}
.proposal-premium-image{
height:460px;
}
.proposal-premium-content{
padding:28px 24px 22px;
}
.proposal-premium-title{
font-size:44px;
}
.proposal-premium-row-grid{
grid-template-columns:1fr;
}
}
@media (max-width: 768px){
#proposalPage.proposal-premium-root{
width:100%;
max-width:100%;
margin:0 auto;
}
.proposal-premium-shell{
padding:0;
}
.proposal-premium-page{
border-radius:0;
min-height:100vh;
box-shadow:none;
display:block;
}
.proposal-premium-image-column{
position:relative;
min-height:auto;
background:#d7cdc2;
}
.proposal-premium-image{
position:relative;
width:100%;
height:auto;
max-height:none;
object-fit:contain;
object-position:center;
}
.proposal-premium-image-overlay{
display:none;
}
.proposal-premium-content{
padding:22px 16px 18px;
}
.proposal-premium-title{
font-size:34px;
line-height:1.14;
}
.proposal-premium-studio{
margin-top:18px;
font-size:23px;
}
.proposal-premium-phone{
font-size:14px;
}
.proposal-premium-meta{
grid-template-columns:1fr;
padding:16px;
gap:10px;
}
.proposal-premium-meta-item{
flex-direction:column;
align-items:flex-start;
gap:4px;
}
.proposal-premium-section{
padding:16px;
border-radius:18px;
margin-top:14px;
}
.proposal-premium-section-title{
font-size:24px;
}
.proposal-premium-service-row{
flex-direction:column;
align-items:flex-start;
gap:4px;
font-size:14px;
}
.proposal-premium-service-row span:last-child{
text-align:left;
}
.proposal-premium-summary-row{
font-size:14px;
}
.proposal-premium-summary-row strong:first-child,
.proposal-premium-summary-row strong:last-child{
font-size:14px;
font-weight:600;
}
.proposal-premium-actions{
grid-template-columns:1fr;
gap:16px;
}
.proposal-premium-btn{
width:100%;
padding:18px 18px;
font-size:17px;
border-radius:18px;
}
.proposal-premium-btn-pdf{
background:var(--proposal-premium-dark);
}
}
@page{
size:A4;
margin:0;
}
@media print{
html,
body{
background:#ffffff !important;
margin:0 !important;
padding:0 !important;
}
body{
-webkit-print-color-adjust:exact !important;
print-color-adjust:exact !important;
}
#proposalPage.proposal-premium-root{
width:794px !important;
max-width:794px !important;
min-width:794px !important;
margin:0 auto !important;
background:#ffffff !important;
box-shadow:none !important;
}
.proposal-premium-shell{
background:#ffffff !important;
padding:0 !important;
min-height:auto !important;
}
.proposal-premium-page{
width:794px !important;
max-width:794px !important;
min-width:794px !important;
min-height:auto !important;
border-radius:0 !important;
box-shadow:none !important;
grid-template-columns:318px 476px !important;
display:grid !important;
}
.proposal-premium-image-column{
min-height:auto !important;
}
.proposal-premium-image{
height:100% !important;
object-fit:cover !important;
}
.proposal-premium-content{
padding:28px 24px 22px !important;
}
.proposal-premium-title{
font-size:34px !important;
}
.proposal-premium-studio{
font-size:22px !important;
}
.proposal-premium-phone{
font-size:13px !important;
}
.proposal-premium-meta{
grid-template-columns:1fr !important;
padding:14px 16px !important;
}
.proposal-premium-meta-item{
flex-direction:row !important;
align-items:center !important;
}
.proposal-premium-section,
.proposal-premium-meta{
background:#ffffff !important;
box-shadow:none !important;
break-inside:avoid;
page-break-inside:avoid;
}
.proposal-premium-actions{
display:none !important;
}
}
`
document.head.appendChild(style)

}


// ======================
// RENDER PREMIUM PROPOSAL
// ======================

function renderPremiumProposal(data, profile, services, deliverables){

injectPremiumStyles()

const page = document.getElementById("proposalPage")

if(!page) return

const coverImage = getProposalCoverImage(data,profile)
const accentColor = getProposalAccentColor(data,profile)
const proposalTitle = getProposalTitle(data)
const eventDateText = getEventDateText(data)

page.classList.add("proposal-premium-root")

page.innerHTML = `
<div class="proposal-premium-shell">
  <div class="proposal-premium-page">

    <div class="proposal-premium-image-column">
      <img class="proposal-premium-image" src="${escapeHtml(coverImage)}" alt="Proposal Cover">
      <div class="proposal-premium-image-overlay"></div>
    </div>

    <div class="proposal-premium-content">

      <div class="proposal-premium-header">
        <h1 class="proposal-premium-title" style="color:${escapeHtml(accentColor)}">${escapeHtml(proposalTitle)}</h1>
        <div class="proposal-premium-studio">${escapeHtml(profile?.studio_name || "")}</div>
        <div class="proposal-premium-phone">${escapeHtml(profile?.phone || "")}</div>
      </div>

      <div class="proposal-premium-meta">
        <div class="proposal-premium-meta-item">
          <span>Prepared For</span>
          <span>${escapeHtml(data.client_name || "")}</span>
        </div>

        <div class="proposal-premium-meta-item">
          <span>Event Dates</span>
          <span>${escapeHtml(eventDateText)}</span>
        </div>
      </div>

      <div class="proposal-premium-row-grid">

        <div class="proposal-premium-section">
          <h2 class="proposal-premium-section-title">Services & Coverage</h2>
          ${buildPremiumServicesHtml(services)}
        </div>

        <div class="proposal-premium-section">
          <h2 class="proposal-premium-section-title">Investment Summary</h2>

          <div class="proposal-premium-summary-row">
            <strong>Total Investment</strong>
            <strong>${escapeHtml(formatMoney(data.total))}</strong>
          </div>

          <div class="proposal-premium-summary-row">
            <strong>Advance Required</strong>
            <strong>${escapeHtml(formatMoney(data.advance))}</strong>
          </div>

          <div class="proposal-premium-summary-row">
            <strong>Balance</strong>
            <strong>${escapeHtml(formatMoney(data.balance))}</strong>
          </div>
        </div>

      </div>

      <div class="proposal-premium-section">
        <h2 class="proposal-premium-section-title">Deliverables</h2>
        <ul class="proposal-premium-list">
          ${buildPremiumDeliverablesHtml(deliverables)}
        </ul>
      </div>

      <div class="proposal-premium-section">
        <h2 class="proposal-premium-section-title">Why Choose Us</h2>

        <div class="proposal-premium-copy">
          We believe every celebration has a story worth preserving forever.
          Our team focuses on capturing real emotions, beautiful details, and timeless moments.

          <ul>
            <li>Professional and experienced photography team</li>
            <li>Creative cinematic storytelling approach</li>
            <li>High quality editing and color grading</li>
            <li>Premium album design and printing</li>
            <li>Reliable service and timely delivery</li>
          </ul>
        </div>
      </div>

      <div class="proposal-premium-section">
        <h2 class="proposal-premium-section-title">Booking Terms</h2>

        <div class="proposal-premium-copy">
          <ul>
            <li>Booking will be confirmed only after advance payment.</li>
            <li>Event date will be reserved only after confirmation.</li>
            <li>Remaining balance must be cleared before final delivery.</li>
            <li>Delivery timeline may vary depending on project scope.</li>
            <li>Any additional services will be charged separately.</li>
          </ul>
        </div>

        <div class="proposal-premium-actions">
          <button class="proposal-premium-btn proposal-premium-btn-whatsapp" onclick="sendWhatsApp()">Send Proposal on WhatsApp</button>
          <button id="proposalDownloadPdfBtn" class="proposal-premium-btn proposal-premium-btn-pdf" onclick="downloadPDF()">Download PDF</button>
        </div>

        <div class="proposal-premium-footer">
          <p><strong>Generated by StudioOS</strong></p>
          <p>Professional Photography Business Operating System</p>
        </div>
      </div>

    </div>

  </div>
</div>
`

}


// ======================
// LOAD PROPOSAL
// ======================

async function loadProposal(){

try{

await waitForSupabase()

const supabase = await window.getSupabase()

let data = null


// ======================
// GET CURRENT USER (SAFE)
// ======================

let user = null
try{
const res = await supabase.auth.getUser()
user = res?.data?.user || null
}catch(e){
console.log("User fetch error", e)
}


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


// ======================
// SAFE DATA CHECK
// ======================

if(!data){

console.warn("Proposal not found:", quotationId || shortId)
showProposalUnavailable("This proposal could not be found.")
return

}


// ======================
// LOAD STUDIO PROFILE
// ======================

let profile = null

try{

const { data: row } =
await supabase
.from("photographer_settings")
.select("*")
.eq("user_id", data.user_id)
.maybeSingle()

if(row){
profile = row
}

}catch(e){
console.log("Profile load error",e)
}


// ======================
// SAVE ACTIVE STATE
// ======================

activeProposalData = data
activeProposalProfile = profile


// ======================
// THEME ENGINE
// ======================

if(profile){

const theme = profile.theme || "gold"

const themeLink = document.getElementById("theme-style")

if(themeLink){
themeLink.href = "themes/" + theme + ".css"
}

}


// ======================
// DATA PARSE
// ======================

const services = parseServices(data.services)
const deliverables = parseDeliverables(data.deliverables)


// ======================
// PREMIUM SWITCH
// ======================

if(isPremiumUser(profile)){
renderPremiumProposal(data, profile, services, deliverables)
finishProposalLoading()
return
}


// ======================
// LOAD STUDIO INFO
// ======================

const page = document.getElementById("proposalPage")
if(page){
page.classList.remove("proposal-premium-root")
}

const studioNameEl = document.getElementById("studioName")
const studioPhoneEl = document.getElementById("studioPhone")

let studioName = ""
let studioPhone = ""

if(profile){
studioName = profile.studio_name || ""
studioPhone = profile.phone || ""
}

if(studioNameEl){
studioNameEl.textContent = studioName
}

if(studioPhoneEl){
studioPhoneEl.textContent = studioPhone
}


// ======================
// HERO TITLE
// ======================

const heroTitle = document.querySelector(".hero h1")

if(heroTitle){
heroTitle.innerText = getProposalTitle(data)
}


// ======================
// CLIENT INFO
// ======================

const clientNameEl = document.getElementById("clientName")

if(clientNameEl){
clientNameEl.innerText = data.client_name || ""
}


// ======================
// EVENT DATE
// ======================

const eventDateEl = document.getElementById("eventDate")

if(eventDateEl){
eventDateEl.innerText = getEventDateText(data)
}


// ======================
// MONEY
// ======================

const totalEl = document.getElementById("total")
const advanceEl = document.getElementById("advance")
const balanceEl = document.getElementById("balance")

if(totalEl){
totalEl.innerText = formatMoney(data.total)
}

if(advanceEl){
advanceEl.innerText = formatMoney(data.advance)
}

if(balanceEl){
balanceEl.innerText = formatMoney(data.balance)
}


// ======================
// SERVICES
// ======================

function setService(id,value){
const el = document.getElementById(id)
if(el){
el.innerText = value
}
}

setService("candidQty",
(services.candid?.qty || 0) + " x " + (services.candid?.days || 0) + " Days")

setService("traditionalPhotoQty",
(services.traditional_photo?.qty || 0) + " x " + (services.traditional_photo?.days || 0) + " Days")

setService("traditionalVideoQty",
(services.traditional_video?.qty || 0) + " x " + (services.traditional_video?.days || 0) + " Days")

setService("cinemaQty",
(services.cinematographer?.qty || 0) + " x " + (services.cinematographer?.days || 0) + " Days")

setService("droneQty",
(services.drone?.qty || 0) + " x " + (services.drone?.days || 0) + " Days")

setService("ledQty",
(services.led_wall?.qty || 0) + " x " + (services.led_wall?.days || 0) + " Days")

setService("assistantQty",
(services.assistant?.qty || 0) + " x " + (services.assistant?.days || 0) + " Days")


// ======================
// DELIVERABLES
// ======================

const list = document.getElementById("deliverablesList")

if(list){

list.innerHTML = ""

if(deliverables.raw)
list.innerHTML += "<li>All Raw Soft Copy</li>"

if(deliverables.traditional_video)
list.innerHTML += "<li>Traditional Full Event Video</li>"

if(deliverables.cinematic)
list.innerHTML += "<li>Cinematic Highlight Film</li>"

if(deliverables.album?.enabled)
list.innerHTML += "<li>Premium Printed Album (" + (deliverables.album.pages || 0) + " Pages)</li>"

if(deliverables.gift?.enabled)
list.innerHTML += "<li>Complimentary Gift : " + escapeHtml(deliverables.gift.name || "-") + "</li>"

}

finishProposalLoading()

}catch(error){
console.error("PROPOSAL LOAD ERROR:", error)
showProposalUnavailable("Something went wrong while loading this proposal.")
}

}

window.addEventListener("load", function(){
loadProposal()
})