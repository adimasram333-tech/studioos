// =============================
// SAFE ELEMENT GETTER
// =============================

function get(id){
return document.getElementById(id)
}


// =============================
// SLUG GENERATOR
// =============================

function slugify(text){
return text
.toString()
.toLowerCase()
.trim()
.replace(/\s+/g,"-")
.replace(/[^\w\-]+/g,"")
.replace(/\-\-+/g,"-")
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


// =============================
// BASIC VALIDATION
// =============================

const clientName = get("clientName")?.value || ""
const clientPhone = get("clientPhone")?.value || ""
const startDate = get("startDate")?.value || ""

if(!clientName){
alert("Enter client name")
return
}

if(!clientPhone){
alert("Enter client phone")
return
}

if(!startDate){
alert("Select event date")
return
}


// =============================
// BUILD QUOTATION DATA
// =============================

const quotationData = {

client_name: clientName,
phone: clientPhone,

event_date: startDate,
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
qty: parseInt(get("candidQty")?.value || 0),
days: parseInt(get("candidDays")?.value || 0)
},

traditional_photo: {
qty: parseInt(get("traditionalPhotoQty")?.value || 0),
days: parseInt(get("traditionalPhotoDays")?.value || 0)
},

traditional_video: {
qty: parseInt(get("traditionalVideoQty")?.value || 0),
days: parseInt(get("traditionalVideoDays")?.value || 0)
},

cinematographer: {
qty: parseInt(get("cinemaQty")?.value || 0),
days: parseInt(get("cinemaDays")?.value || 0)
},

drone: {
qty: parseInt(get("droneQty")?.value || 0),
days: parseInt(get("droneDays")?.value || 0)
},

led_wall: {
qty: parseInt(get("ledQty")?.value || 0),
days: parseInt(get("ledDays")?.value || 0)
},

assistant: {
qty: parseInt(get("assistantQty")?.value || 0),
days: parseInt(get("assistantDays")?.value || 0)
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
pages: parseInt(albumPagesInput?.value || 0)
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
// SEO FRIENDLY LINK
// =============================

const slug = slugify(clientName)

const shortId = saved.id.substring(0,8)

window.location.href =
"p/" + slug + "-" + shortId

})

}