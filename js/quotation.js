document.getElementById("previewBtn").addEventListener("click",function(){

const data = {

clientName:
document.getElementById("clientName").value,

startDate:
document.getElementById("startDate").value,

endDate:
document.getElementById("endDate").value,

total:
document.getElementById("totalAmount").value,

advance:
document.getElementById("advanceAmount").value,

balance:
document.getElementById("balanceAmount").value,


// DELIVERABLES

raw:
document.getElementById("rawCheck").checked,

traditional:
document.getElementById("traditionalCheck").checked,

cinematic:
document.getElementById("cinematicCheck").checked,

album:
document.getElementById("albumCheck").checked,

albumPages:
document.getElementById("albumPagesInput").value,

gift:
document.getElementById("giftCheck").checked,

giftName:
document.getElementById("giftInput").value

}

localStorage.setItem("quotationData",JSON.stringify(data))

window.location.href="proposal.html"

})