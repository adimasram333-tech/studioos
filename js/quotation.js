const packageSelect = document.getElementById("packageSelect")

const totalInput = document.getElementById("totalAmount")

const advanceInput = document.getElementById("advanceAmount")

const balanceInput = document.getElementById("balanceAmount")

const albumCheck = document.getElementById("albumCheck")

const albumPages = document.getElementById("albumPages")

const giftCheck = document.getElementById("giftCheck")

const giftName = document.getElementById("giftName")


// PACKAGE PRICE AUTO

packageSelect.addEventListener("change",function(){

totalInput.value = this.value

calculateBalance()

})


// BALANCE CALC

advanceInput.addEventListener("input",calculateBalance)

function calculateBalance(){

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}


// ALBUM INPUT SHOW

albumCheck.addEventListener("change",function(){

if(this.checked){

albumPages.classList.remove("hidden")

}else{

albumPages.classList.add("hidden")

}

})


// GIFT INPUT SHOW

giftCheck.addEventListener("change",function(){

if(this.checked){

giftName.classList.remove("hidden")

}else{

giftName.classList.add("hidden")

}

})


// PREVIEW

document.getElementById("previewBtn").addEventListener("click",function(){

const quotation = {

clientName: document.getElementById("clientName").value,
eventDate: document.getElementById("startDate").value,

total: totalInput.value,
advance: advanceInput.value,
balance: balanceInput.value

}

localStorage.setItem("quotationData",JSON.stringify(quotation))

window.location.href="proposal.html"

})