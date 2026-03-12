// ======================
// GET QUOTATION ID
// ======================

let quotationId = null

const params = new URLSearchParams(window.location.search)

if(params.get("id")){
quotationId = params.get("id")
}


// ======================
// SUPPORT SEO LINK
// ======================

let shortId = null

if(!quotationId){

const pathParts = window.location.pathname.split("/")
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
// LOAD PROPOSAL
// ======================

async function loadProposal(){

let data = null

if(quotationId){
data = await getQuotationById(quotationId)
}

if(!data && shortId){

const { data: row } = await supabase
.from("quotations")
.select("*")
.eq("short_id", shortId)
.single()

if(row){
data = row
quotationId = row.id
}

}

if(!data){
alert("Proposal not found")
return
}


// ======================
// LOAD STUDIO PROFILE
// ======================

let profile = null

if(data.user_id){

const { data: profileRow } =
await supabase
.from("photographer_settings")
.select("*")
.eq("user_id", data.user_id)
.single()

profile = profileRow

}

if(!profile){

const { data: fallback } =
await supabase
.from("photographer_settings")
.select("*")
.limit(1)
.single()

profile = fallback

}


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
// LOAD STUDIO INFO
// ======================

if(profile){

document.getElementById("studioName").innerText =
profile.studio_name || ""

document.getElementById("studioPhone").innerText =
profile.phone || ""

}


// ======================
// CLIENT INFO
// ======================

document.getElementById("clientName").innerText =
data.client_name || ""


// ======================
// EVENT DATE
// ======================

let eventDateText = "-"

if(data.event_date && data.end_date){
eventDateText = data.event_date + " → " + data.end_date
}else{
eventDateText = data.event_date || "-"
}

document.getElementById("eventDate").innerText = eventDateText


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

document.getElementById("candidQty").innerText =
(services.candid?.qty || 0) + " x " + (services.candid?.days || 0) + " Days"

document.getElementById("traditionalPhotoQty").innerText =
(services.traditional_photo?.qty || 0) + " x " + (services.traditional_photo?.days || 0) + " Days"

document.getElementById("traditionalVideoQty").innerText =
(services.traditional_video?.qty || 0) + " x " + (services.traditional_video?.days || 0) + " Days"

document.getElementById("cinemaQty").innerText =
(services.cinematographer?.qty || 0) + " x " + (services.cinematographer?.days || 0) + " Days"

document.getElementById("droneQty").innerText =
(services.drone?.qty || 0) + " x " + (services.drone?.days || 0) + " Days"

document.getElementById("ledQty").innerText =
(services.led_wall?.qty || 0) + " x " + (services.led_wall?.days || 0) + " Days"

document.getElementById("assistantQty").innerText =
(services.assistant?.qty || 0) + " x " + (services.assistant?.days || 0) + " Days"


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


// ======================
// WHATSAPP SHARE
// ======================

window.sendWhatsApp = function(){

const phone = data.phone || ""

const message =
`Hello ${data.client_name},

Your wedding photography proposal is ready.

View your proposal:
${window.location.href}

For booking contact:

${profile?.studio_name || ""}
Phone: ${profile?.phone || ""}

Powered by StudioOS`

const url =
"https://wa.me/91" + phone + "?text=" + encodeURIComponent(message)

window.open(url,"_blank")

}


// ======================
// PERFECT PDF EXPORT
// ======================

window.downloadPDF = function(){

window.scrollTo(0,0)

const element = document.getElementById("proposalPage")

const opt = {

margin:0,

filename:"photography-proposal.pdf",

image:{
type:"jpeg",
quality:1
},

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

html2pdf()
.set(opt)
.from(element)
.save()

}

}

loadProposal()