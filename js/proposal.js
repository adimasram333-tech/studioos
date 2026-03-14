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

while(!window.supabase && tries < 50){
await new Promise(r => setTimeout(r,100))
tries++
}

}


// ======================
// THEME ENGINE
// ======================

function applyTheme(themeName){

const allowedThemes = [
"gold",
"royal",
"emerald"
]

let theme = themeName || "gold"

if(!allowedThemes.includes(theme)){
theme = "gold"
}

const themeLink = document.getElementById("theme-style")

if(themeLink){
themeLink.href = "themes/" + theme + ".css"
}

}


// ======================
// LOAD PROPOSAL
// ======================

async function loadProposal(){

await waitForSupabase()

let data = null


// ======================
// GET CURRENT USER
// ======================

const { data:{ user } } =
await supabase.auth.getUser()


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

const page = document.getElementById("proposalPage")

if(page){
page.innerHTML =
"<h2 style='text-align:center;margin-top:40px'>Proposal not available</h2>"
}

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
// APPLY THEME
// ======================

if(profile){

applyTheme(profile.theme)

}else{

applyTheme("gold")

}


// ======================
// LOAD STUDIO INFO
// ======================

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

let category = data.event_category || "Photography"

heroTitle.innerText = category + " Photography Proposal"

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

let eventDateText = "-"

if(data.event_date && data.end_date){

eventDateText =
formatDate(data.event_date) +
" → " +
formatDate(data.end_date)

}else{

eventDateText = formatDate(data.event_date)

}

const eventDateEl = document.getElementById("eventDate")

if(eventDateEl){
eventDateEl.innerText = eventDateText
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

let services = data.services || {}

if(typeof services === "string"){
try{
services = JSON.parse(services)
}catch(e){
services = {}
}
}

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
list.innerHTML += "<li>Traditional Full Event Video</li>"

if(deliverables.cinematic)
list.innerHTML += "<li>Cinematic Highlight Film</li>"

if(deliverables.album?.enabled)
list.innerHTML += "<li>Premium Printed Album (" + (deliverables.album.pages || 0) + " Pages)</li>"

if(deliverables.gift?.enabled)
list.innerHTML += "<li>Complimentary Gift : " + (deliverables.gift.name || "-") + "</li>"

}


// ======================
// WHATSAPP SHARE
// ======================

window.sendWhatsApp = function(){

const phone = data.phone || ""

let clientSlug =
(data.client_name || "")
.toLowerCase()
.replace(/[^a-z0-9 ]/g,"")
.replace(/\s+/g,"-")

const shortLink =
window.location.origin +
"/studioos/p/" +
clientSlug +
"-" +
(data.short_id || "")

const message =
`Hello ${data.client_name},

Your photography proposal is ready.

View your proposal:
${shortLink}

For booking contact:

${studioName}
Phone: ${studioPhone}

Powered by StudioOS`

const url =
"https://wa.me/91" + phone + "?text=" + encodeURIComponent(message)

window.open(url,"_blank")

}


// ======================
// PDF EXPORT
// ======================

window.downloadPDF = function(){

window.scrollTo(0,0)

const element = document.getElementById("proposalPage")

const opt = {

margin:0,
filename:"photography-proposal.pdf",

image:{ type:"jpeg", quality:1 },

html2canvas:{
scale:2,
useCORS:true,
scrollX:0,
scrollY:0
},

jsPDF:{
unit:"mm",
format:[210,297],
orientation:"portrait"
}

}

html2pdf().set(opt).from(element).save()

}

}

window.addEventListener("load", function(){
loadProposal()
})