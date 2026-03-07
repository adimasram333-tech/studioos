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

previewBtn.addEventListener("click", async function(){

const quotationData = {

client_name: get("clientName")?.value || "",
phone: get("clientPhone")?.value || "",

// =============================
// EVENT DATES FIX
// =============================

event_date: get("startDate")?.value || "",
end_date: get("endDate")?.value || "",

package: packageSelect?.value || "",

total: parseFloat(totalInput?.value || 0),
advance: parseFloat(advanceInput?.value || 0),
balance: parseFloat(balanceInput?.value || 0),

status: "proposal",


// =============================
// SERVICES JSON
// =============================

services: {

candid: {
qty: get("candidQty")?.value || 0,
days: get("candidDays")?.value || 0
},

traditional_photo: {
qty: get("traditionalPhotoQty")?.value || 0,
days: get("traditionalPhotoDays")?.value || 0
},

traditional_video: {
qty: get("traditionalVideoQty")?.value || 0,
days: get("traditionalVideoDays")?.value || 0
},

cinematographer: {
qty: get("cinemaQty")?.value || 0,
days: get("cinemaDays")?.value || 0
},

drone: {
qty: get("droneQty")?.value || 0,
days: get("droneDays")?.value || 0
},

led_wall: {
qty: get("ledQty")?.value || 0,
days: get("ledDays")?.value || 0
},

assistant: {
qty: get("assistantQty")?.value || 0,
days: get("assistantDays")?.value || 0
}

},


// =============================
// DELIVERABLES JSON
// =============================

deliverables: {

raw: get("rawCheck")?.checked || false,
traditional_video: get("traditionalCheck")?.checked || false,
cinematic: get("cinematicCheck")?.checked || false,

album: {
enabled: albumCheck?.checked || false,
pages: albumPagesInput?.value || ""
},

gift: {
enabled: giftCheck?.checked || false,
name: giftInput?.value || ""
}

}

}


// =============================
// SAVE TO SUPABASE
// =============================

const saved = await saveQuotation(quotationData)

if(!saved){

alert("Error saving quotation")
return

}


// =============================
// REDIRECT TO PROPOSAL
// =============================

window.location.href = "proposal.html?id=" + saved.id

})

}