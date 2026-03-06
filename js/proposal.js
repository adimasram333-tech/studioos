const data = JSON.parse(localStorage.getItem("quotationData"))

if(data){

// ======================
// CLIENT INFO
// ======================

document.getElementById("clientName").innerText =
data.clientName || "-"


document.getElementById("eventDate").innerText =
(data.startDate || "-") + " to " + (data.endDate || "-")


// ======================
// MONEY FORMAT
// ======================

document.getElementById("total").innerText =
"₹ " + (data.total || "0") + " /-"

document.getElementById("advance").innerText =
"₹ " + (data.advance || "0") + " /-"

document.getElementById("balance").innerText =
"₹ " + (data.balance || "0") + " /-"


// ======================
// SERVICES TABLE
// ======================

document.getElementById("candidQty").innerText =
data.candidQty || "0"

document.getElementById("traditionalPhotoQty").innerText =
data.traditionalPhotoQty || "0"

document.getElementById("cinemaQty").innerText =
data.cinemaQty || "0"

document.getElementById("droneQty").innerText =
data.droneQty || "0"

document.getElementById("daysQty").innerText =
data.daysQty || "1"


// ======================
// DELIVERABLES
// ======================

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