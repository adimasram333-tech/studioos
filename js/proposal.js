const data = JSON.parse(localStorage.getItem("quotationData"))

if(data){

// CLIENT

document.getElementById("clientName").innerText =
data.clientName || "-"


// EVENT DATE

document.getElementById("eventDate").innerText =
(data.startDate || "-") + " to " + (data.endDate || "-")


// MONEY FORMAT

document.getElementById("total").innerText =
"₹ " + (data.total || "0") + " /-"

document.getElementById("advance").innerText =
"₹ " + (data.advance || "0") + " /-"

document.getElementById("balance").innerText =
"₹ " + (data.balance || "0") + " /-"


// DELIVERABLES

const list = document.getElementById("deliverablesList")
list.innerHTML = ""

if(data.raw) list.innerHTML += "<li>All Raw Soft Copy</li>"

if(data.traditional) list.innerHTML += "<li>Traditional Full Event Video</li>"

if(data.cinematic) list.innerHTML += "<li>Cinematic Highlight Film</li>"

if(data.album) list.innerHTML += "<li>Premium Printed Album ("+data.albumPages+" pages)</li>"

if(data.gift) list.innerHTML += "<li>Complimentary Gift : "+data.giftName+"</li>"

}


// STUDIO NAME

const profile = JSON.parse(localStorage.getItem("studioProfile"))

document.getElementById("studioName").innerText =
profile?.studioName || "Your Studio"