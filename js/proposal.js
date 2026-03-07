// ======================
// GET QUOTATION ID
// ======================

const params = new URLSearchParams(window.location.search)
const quotationId = params.get("id")


// ======================
// LOAD PROPOSAL
// ======================

async function loadProposal(){

if(!quotationId){
alert("Invalid proposal link")
return
}

const data = await getQuotationById(quotationId)

if(!data){
alert("Proposal not found")
return
}


// ======================
// CLIENT INFO
// ======================

document.getElementById("clientName").innerText =
data.client_name || "-"


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
"₹ " + (data.total || 0) + " /-"

document.getElementById("advance").innerText =
"₹ " + (data.advance || 0) + " /-"

document.getElementById("balance").innerText =
"₹ " + (data.balance || 0) + " /-"



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
(services.candid?.qty || 0) + " × " + (services.candid?.days || 0) + " Days"

document.getElementById("traditionalPhotoQty").innerText =
(services.traditional_photo?.qty || 0) + " × " + (services.traditional_photo?.days || 0) + " Days"

document.getElementById("traditionalVideoQty").innerText =
(services.traditional_video?.qty || 0) + " × " + (services.traditional_video?.days || 0) + " Days"

document.getElementById("cinemaQty").innerText =
(services.cinematographer?.qty || 0) + " × " + (services.cinematographer?.days || 0) + " Days"

document.getElementById("droneQty").innerText =
(services.drone?.qty || 0) + " × " + (services.drone?.days || 0) + " Days"

document.getElementById("ledQty").innerText =
(services.led_wall?.qty || 0) + " × " + (services.led_wall?.days || 0) + " Days"

document.getElementById("assistantQty").innerText =
(services.assistant?.qty || 0) + " × " + (services.assistant?.days || 0) + " Days"



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
const proposalLink = window.location.href

const message =
`Hello ${data.client_name},

Your wedding photography proposal is ready.

View Proposal:
${proposalLink}

For booking contact:

Aditya Masram Photography
📞 8087945135

Thank you.`

const url =
"https://wa.me/91" + phone + "?text=" + encodeURIComponent(message)

window.open(url,"_blank")

}



// ======================
// PDF DOWNLOAD
// ======================

window.downloadPDF = function(){

const element = document.getElementById("proposalPage")

// remove shadow for pdf
element.style.boxShadow = "none"
element.style.margin = "0 auto"

const opt = {

margin:0,

filename:"photography-proposal.pdf",

image:{
type:"jpeg",
quality:1
},

html2canvas:{
scale:3,
scrollY:0,
useCORS:true
},

jsPDF:{
unit:"mm",
format:"a4",
orientation:"portrait"
}

}

html2pdf()
.set(opt)
.from(element)
.save()

// restore shadow after export
setTimeout(()=>{
element.style.boxShadow="0 10px 40px rgba(0,0,0,0.08)"
},1000)

}

}


// ======================
// INIT
// ======================

loadProposal()