const data = JSON.parse(localStorage.getItem("quotationData"))

if(data){

document.getElementById("clientName").innerText =
data.clientName || "-"


// EVENT DATE RANGE

const dateText =

(data.startDate || "-") +
"  to  " +
(data.endDate || "-")

document.getElementById("eventDate").innerText = dateText


document.getElementById("total").innerText =
data.total || "-"

document.getElementById("advance").innerText =
data.advance || "-"

document.getElementById("balance").innerText =
data.balance || "-"

}



// STUDIO NAME

const profile = JSON.parse(localStorage.getItem("studioProfile"))

document.getElementById("studioName").innerText =
profile?.studioName || "Your Studio"