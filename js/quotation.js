// PACKAGE PRICE AUTO LOAD

const packageSelect = document.getElementById("packageSelect")
const totalInput = document.getElementById("totalAmount")
const advanceInput = document.getElementById("advanceAmount")
const balanceInput = document.getElementById("balanceAmount")

packageSelect.addEventListener("change", function(){

const price = this.value

totalInput.value = price

calculateBalance()

})


// BALANCE CALCULATION

advanceInput.addEventListener("input", calculateBalance)

function calculateBalance(){

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}



// PRINTED ALBUM INPUT

const albumCheck = document.getElementById("albumCheck")
const albumInput = document.getElementById("albumPagesInput")

albumCheck.addEventListener("change",function(){

if(this.checked){

albumInput.style.display = "block"

}else{

albumInput.style.display = "none"

}

})



// FREE GIFT INPUT

const giftCheck = document.getElementById("giftCheck")
const giftInput = document.getElementById("giftInput")

giftCheck.addEventListener("change",function(){

if(this.checked){

giftInput.style.display = "block"

}else{

giftInput.style.display = "none"

}

})




// PREVIEW BUTTON

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

localStorage.setItem("quotationData", JSON.stringify(data))

window.location.href="proposal.html"

})