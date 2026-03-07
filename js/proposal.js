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

document.getElementById("eventDate").innerText =
data.event_date || "-"



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

const message =
"Hello " + data.client_name +
"%0A%0AHere is your photography proposal." +
"%0A%0AEvent Date: " + data.event_date +
"%0A%0ATotal Investment: ₹" + data.total +
"%0A%0AThank you."

const url =
"https://wa.me/91" + phone + "?text=" + message

window.open(url,"_blank")

}



// ======================
// PDF DOWNLOAD
// ======================

window.downloadPDF = function(){

const element = document.getElementById("proposalPage")

html2pdf().from(element).save("proposal.pdf")

}

}



// ======================
// INIT
// ======================

loadProposal()