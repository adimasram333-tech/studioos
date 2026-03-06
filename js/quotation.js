// =============================
// SAFE ELEMENT GETTER
// =============================

function get(id){
return document.getElementById(id)
}


// =============================
// PACKAGE PRICE AUTO
// =============================

const packageSelect = get("packageSelect")
const totalInput = get("totalAmount")
const advanceInput = get("advanceAmount")
const balanceInput = get("balanceAmount")

if(packageSelect && totalInput){

packageSelect.addEventListener("change",function(){

totalInput.value = this.value || ""

calculateBalance()

})

}


// =============================
// BALANCE CALCULATION
// =============================

function calculateBalance(){

if(!totalInput || !advanceInput || !balanceInput) return

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}

if(advanceInput){
advanceInput.addEventListener("input",calculateBalance)
}


// =============================
// ALBUM INPUT TOGGLE
// =============================

const albumCheck = get("albumCheck")
const albumPagesInput = get("albumPagesInput")

if(albumCheck && albumPagesInput){

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

const giftCheck = get("giftCheck")
const giftInput = get("giftInput")

if(giftCheck && giftInput){

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

const previewBtn = get("previewBtn")

if(previewBtn){

previewBtn.addEventListener("click",function(){

const data = {

clientName: get("clientName")?.value || "",
clientPhone: get("clientPhone")?.value || "",
eventCategory: get("eventCategory")?.value || "",

startDate: get("startDate")?.value || "",
endDate: get("endDate")?.value || "",

total: totalInput?.value || "",
advance: advanceInput?.value || "",
balance: balanceInput?.value || "",


// =============================
// SERVICES
// =============================

candidQty: get("candidQty")?.value || "0",
candidDays: get("candidDays")?.value || "0",

traditionalPhotoQty: get("traditionalPhotoQty")?.value || "0",
traditionalPhotoDays: get("traditionalPhotoDays")?.value || "0",

traditionalVideoQty: get("traditionalVideoQty")?.value || "0",
traditionalVideoDays: get("traditionalVideoDays")?.value || "0",

cinemaQty: get("cinemaQty")?.value || "0",
cinemaDays: get("cinemaDays")?.value || "0",

droneQty: get("droneQty")?.value || "0",
droneDays: get("droneDays")?.value || "0",

ledQty: get("ledQty")?.value || "0",
ledDays: get("ledDays")?.value || "0",

assistantQty: get("assistantQty")?.value || "0",
assistantDays: get("assistantDays")?.value || "0",


// =============================
// DELIVERABLES
// =============================

raw: get("rawCheck")?.checked || false,
traditional: get("traditionalCheck")?.checked || false,
cinematic: get("cinematicCheck")?.checked || false,

album: albumCheck?.checked || false,
albumPages: albumPagesInput?.value || "",

gift: giftCheck?.checked || false,
giftName: giftInput?.value || ""

}


// =============================
// SAVE DATA
// =============================

localStorage.setItem("quotationData", JSON.stringify(data))


// =============================
// OPEN PROPOSAL
// =============================

window.location.href = "proposal.html"

})

}