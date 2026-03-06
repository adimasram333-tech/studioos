const data = JSON.parse(localStorage.getItem("quotationData"))

if(data){

document.getElementById("clientName").innerText = data.clientName

document.getElementById("eventDate").innerText = data.eventDate

document.getElementById("total").innerText = data.total

document.getElementById("advance").innerText = data.advance

document.getElementById("balance").innerText = data.balance

}


// studio name

const profile = JSON.parse(localStorage.getItem("studioProfile"))

document.getElementById("studioName").innerText =
profile?.studioName || "Your Studio"