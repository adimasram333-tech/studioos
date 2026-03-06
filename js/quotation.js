// =============================
// PACKAGE PRICE AUTO
// =============================

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


// =============================
// BALANCE CALCULATION
// =============================

function calculateBalance(){

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}

advanceInput.addEventListener("input",calculateBalance)


// =============================
// ALBUM INPUT TOGGLE
// =============================

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


// =============================
// GIFT INPUT TOGGLE
// =============================

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


// =============================
// PREVIEW QUOTE
// =============================

document.getElementById("previewBtn").addEventListener("click",function(){

const data = {

clientName: document.getElementById("clientName").value,

clientPhone: document.getElementById("clientPhone").value,

eventCategory: document.getElementById("eventCategory").value,

startDate: document.getElementById("startDate").value,

endDate: document.getElementById("endDate").value,

total: totalInput.value,

advance: advanceInput.value,

balance: balanceInput.value,


// =============================
// SERVICES
// =============================

candidQty: document.getElementById("candidQty").value,

traditionalPhotoQty:
document.getElementById("traditionalPhotoQty").value,

cinemaQty:
document.getElementById("cinemaQty").value,

droneQty:
document.getElementById("droneQty").value,

daysQty:
document.getElementById("daysQty").value,



// =============================
// DELIVERABLES
// =============================

raw: document.getElementById("rawCheck").checked,

traditional: document.getElementById("traditionalCheck").checked,

cinematic: document.getElementById("cinematicCheck").checked,

album: albumCheck.checked,

albumPages: albumPagesInput.value,

gift: giftCheck.checked,

giftName: giftInput.value

}


// SAVE DATA

localStorage.setItem("quotationData", JSON.stringify(data))


// OPEN PROPOSAL

window.location.href="proposal.html"

})