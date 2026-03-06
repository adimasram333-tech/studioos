// PACKAGE PRICE

const packageSelect = document.getElementById("packageSelect")
const totalInput = document.getElementById("totalAmount")
const advanceInput = document.getElementById("advanceAmount")
const balanceInput = document.getElementById("balanceAmount")

if(packageSelect){

packageSelect.addEventListener("change",function(){

totalInput.value = this.value

calculateBalance()

})

}


// BALANCE

function calculateBalance(){

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}

advanceInput.addEventListener("input",calculateBalance)


// ALBUM INPUT

const albumCheck = document.getElementById("albumCheck")
const albumPagesInput = document.getElementById("albumPagesInput")

if(albumCheck){

albumCheck.addEventListener("change",function(){

if(this.checked){

albumPagesInput.classList.remove("hidden")

}else{

albumPagesInput.classList.add("hidden")

}

})

}


// GIFT INPUT

const giftCheck = document.getElementById("giftCheck")
const giftInput = document.getElementById("giftInput")

if(giftCheck){

giftCheck.addEventListener("change",function(){

if(this.checked){

giftInput.classList.remove("hidden")

}else{

giftInput.classList.add("hidden")

}

})

}


// PREVIEW

document.getElementById("previewBtn").addEventListener("click",function(){

const data = {

clientName:document.getElementById("clientName").value,

startDate:document.getElementById("startDate").value,

endDate:document.getElementById("endDate").value,

total:totalInput.value,

advance:advanceInput.value,

balance:balanceInput.value,


raw:document.getElementById("rawCheck").checked,
traditional:document.getElementById("traditionalCheck").checked,
cinematic:document.getElementById("cinematicCheck").checked,

album:albumCheck.checked,
albumPages:albumPagesInput.value,

gift:giftCheck.checked,
giftName:giftInput.value

}

localStorage.setItem("quotationData",JSON.stringify(data))

window.location.href="proposal.html"

})