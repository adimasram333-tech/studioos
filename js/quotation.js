const packageSelect = document.getElementById("packageSelect")

const totalInput = document.getElementById("totalAmount")
const advanceInput = document.getElementById("advanceAmount")
const balanceInput = document.getElementById("balanceAmount")

const albumCheck = document.getElementById("albumCheck")
const albumPages = document.getElementById("albumPages")

const giftCheck = document.getElementById("giftCheck")
const giftName = document.getElementById("giftName")

// PACKAGE PRICE

packageSelect.addEventListener("change",function(){

totalInput.value = this.value

calculateBalance()

})

// BALANCE

advanceInput.addEventListener("input",calculateBalance)

function calculateBalance(){

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}


// ALBUM INPUT

albumCheck.addEventListener("change",function(){

if(this.checked){

albumPages.classList.remove("hidden")

}else{

albumPages.classList.add("hidden")

}

})


// GIFT INPUT

giftCheck.addEventListener("change",function(){

if(this.checked){

giftName.classList.remove("hidden")

}else{

giftName.classList.add("hidden")

}

})



// PREVIEW BUTTON

document.getElementById("previewBtn").addEventListener("click",function(){

const data = {

clientName: document.getElementById("clientName").value,

startDate: document.getElementById("startDate").value,

endDate: document.getElementById("endDate").value,

total: totalInput.value,

advance: advanceInput.value,

balance: balanceInput.value

}

localStorage.setItem("quotationData",JSON.stringify(data))

window.location.href="proposal.html"

})