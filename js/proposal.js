// ======================
// LOAD DATA
// ======================

const data = JSON.parse(localStorage.getItem("quotationData"))

if(data){

// CLIENT INFO
document.getElementById("clientName").innerText =
data.clientName || "-"

document.getElementById("eventDate").innerText =
(data.startDate || "-") + " to " + (data.endDate || "-")

// MONEY
document.getElementById("total").innerText =
"₹ " + (data.total || "0") + " /-"

document.getElementById("advance").innerText =
"₹ " + (data.advance || "0") + " /-"

document.getElementById("balance").innerText =
"₹ " + (data.balance || "0") + " /-"

// SERVICES
document.getElementById("candidQty").innerText =
(data.candidQty || 0) + " × " + (data.candidDays || 0) + " Days"

document.getElementById("traditionalPhotoQty").innerText =
(data.traditionalPhotoQty || 0) + " × " + (data.traditionalPhotoDays || 0) + " Days"

document.getElementById("cinemaQty").innerText =
(data.cinemaQty || 0) + " × " + (data.cinemaDays || 0) + " Days"

document.getElementById("droneQty").innerText =
(data.droneQty || 0) + " × " + (data.droneDays || 0) + " Days"

document.getElementById("ledQty").innerText =
(data.ledQty || 0) + " × " + (data.ledDays || 0) + " Days"

document.getElementById("assistantQty").innerText =
(data.assistantQty || 0) + " × " + (data.assistantDays || 0) + " Days"

document.getElementById("traditionalVideoQty").innerText =
(data.traditionalVideoQty || 0) + " × " + (data.traditionalVideoDays || 0) + " Days"


// DELIVERABLES

const list = document.getElementById("deliverablesList")

list.innerHTML = ""

if(data.raw)
list.innerHTML += "<li>All Raw Soft Copy</li>"

if(data.traditional)
list.innerHTML += "<li>Traditional Full Event Video</li>"

if(data.cinematic)
list.innerHTML += "<li>Cinematic Highlight Film</li>"

if(data.album)
list.innerHTML += "<li>Premium Printed Album (" + (data.albumPages || "0") + " Pages)</li>"

if(data.gift)
list.innerHTML += "<li>Complimentary Gift : " + (data.giftName || "-") + "</li>"

}


// ======================
// STUDIO NAME
// ======================

const profile = JSON.parse(localStorage.getItem("studioProfile"))

document.getElementById("studioName").innerText =
profile?.studioName || "Your Studio"


// ======================
// WHATSAPP SHARE
// ======================

function sendWhatsApp(){

const data = JSON.parse(localStorage.getItem("quotationData"))

if(!data) return

const phone = data.clientPhone || ""

const message =
"Hello " + data.clientName +
"%0A%0AHere is your photography proposal." +
"%0A%0AEvent Date: " + data.startDate + " to " + data.endDate +
"%0A%0ATotal Investment: ₹" + data.total +
"%0A%0AThank you."

const url =
"https://wa.me/91" + phone + "?text=" + message

window.open(url, "_blank")

}