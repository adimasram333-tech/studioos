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
return "₹ " + Number(num || 0).toLocaleString("en-IN")
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


// ======================
// PDF EXPORT HELPERS
// ======================

function injectPremiumPdfModeStyles(){

if(document.getElementById("premium-pdf-mode-styles")) return

const style = document.createElement("style")
style.id = "premium-pdf-mode-styles"
style.innerHTML = `
body.pdf-mode{
background:#ffffff !important;
overflow:visible !important;
}

body.pdf-mode #proposalPage{
width:794px !important;
max-width:794px !important;
min-width:794px !important;
margin:0 auto !important;
background:#ffffff !important;
}

body.pdf-mode .premium-shell{
background:#ffffff !important;
min-height:auto !important;
}

body.pdf-mode .premium-page{
width:794px !important;
max-width:794px !important;
min-width:794px !important;
margin:0 auto !important;
padding-bottom:0 !important;
}

body.pdf-mode .premium-hero{
height:300px !important;
}

body.pdf-mode .premium-content{
margin:0 !important;
padding:0 !important;
max-width:794px !important;
}

body.pdf-mode .premium-card,
body.pdf-mode .premium-panel{
box-shadow:none !important;
break-inside:avoid !important;
page-break-inside:avoid !important;
border-radius:0 !important;
backdrop-filter:none !important;
-webkit-backdrop-filter:none !important;
background:#111827 !important;
}

body.pdf-mode .premium-actions{
display:none !important;
}
`
document.head.appendChild(style)

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

setTimeout(finish, 10000)
})
}))

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

function waitForNextPaint(){
return new Promise((resolve) => {
requestAnimationFrame(() => {
requestAnimationFrame(resolve)
})
})
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


// ======================
// APPLY COVER IMAGE
// ======================

const cover = document.getElementById("coverImage")

if(profile?.team_sheet_cover_image){
cover.src = profile.team_sheet_cover_image
}


// ======================
// APPLY TITLE COLOR
// ======================

const title = document.getElementById("proposalTitle")

if(profile?.team_sheet_title_color){
title.style.color = profile.team_sheet_title_color
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
" → " +
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

window.sendWhatsApp = function(){

const phone = data.phone || ""

const link =
window.location.href

const msg =
`Hello ${data.client_name},

Your premium photography proposal is ready:

${link}

${profile?.studio_name || ""}
${profile?.phone || ""}`

window.open(
"https://wa.me/91" + phone + "?text=" + encodeURIComponent(msg),
"_blank"
)

}


// ======================
// PDF
// ======================

window.downloadPDF = async function(){

const button = document.querySelector(".premium-btn-pdf")

try{

if(button){
button.disabled = true
button.dataset.originalText = button.dataset.originalText || button.innerText
button.innerText = "Preparing PDF..."
button.style.opacity = "0.75"
button.style.cursor = "not-allowed"
}

window.scrollTo(0,0)

const element = document.getElementById("proposalPage")

if(!element){
alert("Proposal container not found")
return
}

injectPremiumPdfModeStyles()

document.body.classList.add("pdf-mode")

await waitForFonts()
await waitForImagesInElement(element)
await waitForNextPaint()
await waitForNextPaint()

const opt = {
margin:0,
filename:"premium-proposal.pdf",
image:{ type:"jpeg", quality:1 },
html2canvas:{
scale:2,
useCORS:true,
allowTaint:false,
scrollX:0,
scrollY:0,
windowWidth:794,
width:794,
backgroundColor:"#ffffff",
logging:false
},
jsPDF:{
unit:"mm",
format:"a4",
orientation:"portrait"
},
pagebreak:{
mode:["css","legacy"]
}
}

await html2pdf().set(opt).from(element).save()

}catch(e){
console.error("PREMIUM PDF ERROR:", e)
alert("PDF download failed")
}finally{
document.body.classList.remove("pdf-mode")

if(button){
button.disabled = false
button.innerText = button.dataset.originalText || "Download Proposal PDF"
button.style.opacity = "1"
button.style.cursor = "pointer"
}
}

}

}

window.addEventListener("load", loadPremiumProposal)