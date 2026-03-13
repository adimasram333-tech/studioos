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
.replace(/[^a-z0-9\-]/g,"")
.replace(/\-\-+/g,"-")

}


// =============================
// EDIT MODE DETECTION
// =============================

let editId = null

function getQueryParam(name){
const url = new URL(window.location.href)
return url.searchParams.get(name)
}

editId = getQueryParam("edit")


// =============================
// LOAD QUOTATION FOR EDIT
// =============================

async function loadQuotationForEdit(){

if(!editId) return

const { data , error } =
await supabase
.from("quotations")
.select("*")
.eq("id",editId)
.single()

if(error || !data) return

get("clientName").value = data.client_name || ""
get("clientPhone").value = data.phone || ""

get("startDate").value = data.event_date || ""
get("endDate").value = data.end_date || ""

get("packageSelect").value = data.package || ""

// NEW: EVENT CATEGORY LOAD
if(get("eventCategory")){
get("eventCategory").value = data.event_category || ""
}

get("totalAmount").value = data.total || ""
get("advanceAmount").value = data.advance || ""
get("balanceAmount").value = data.balance || ""


// ===== SERVICES =====

if(data.services){

get("candidQty").value = data.services.candid?.qty || 0
get("candidDays").value = data.services.candid?.days || 0

get("traditionalPhotoQty").value =
data.services.traditional_photo?.qty || 0

get("traditionalPhotoDays").value =
data.services.traditional_photo?.days || 0

get("traditionalVideoQty").value =
data.services.traditional_video?.qty || 0

get("traditionalVideoDays").value =
data.services.traditional_video?.days || 0

get("cinemaQty").value =
data.services.cinematographer?.qty || 0

get("cinemaDays").value =
data.services.cinematographer?.days || 0

get("droneQty").value =
data.services.drone?.qty || 0

get("droneDays").value =
data.services.drone?.days || 0

get("ledQty").value =
data.services.led_wall?.qty || 0

get("ledDays").value =
data.services.led_wall?.days || 0

get("assistantQty").value =
data.services.assistant?.qty || 0

get("assistantDays").value =
data.services.assistant?.days || 0

}


// ===== DELIVERABLES =====

if(data.deliverables){

get("rawCheck").checked = data.deliverables.raw || false
get("traditionalCheck").checked =
data.deliverables.traditional_video || false

get("cinematicCheck").checked =
data.deliverables.cinematic || false

get("albumCheck").checked =
data.deliverables.album?.enabled || false

get("albumPagesInput").value =
data.deliverables.album?.pages || ""

get("giftCheck").checked =
data.deliverables.gift?.enabled || false

get("giftInput").value =
data.deliverables.gift?.name || ""

}

}

loadQuotationForEdit()


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
// CHECK EVENT LOAD (SOFT WARNING)
// =============================

async function checkEventLoad(date,userId){

const { data } =
await supabase
.from("quotations")
.select("event_date")
.eq("user_id",userId)
.eq("event_date",date)
.eq("status","confirmed")

return data?.length || 0

}


// =============================
// SAVE / UPDATE QUOTATION
// =============================

async function saveQuotation(data){

try{

if(editId){

const { error } =
await supabase
.from("quotations")
.update(data)
.eq("id",editId)

if(error){
console.error(error)
return null
}

return { id: editId }

}else{

const { data:inserted , error } =
await supabase
.from("quotations")
.insert(data)
.select()
.single()

if(error){
console.error(error)
return null
}

return inserted

}

}catch(err){

console.error(err)
return null

}

}


// =============================
// PREVIEW QUOTE
// =============================

const previewBtn = get("previewBtn")

if(previewBtn){

previewBtn.addEventListener("click", async function(){

previewBtn.disabled = true
previewBtn.innerText = "Generating..."


// GET USER

const { data:{ user } } =
await supabase.auth.getUser()

if(!user){

alert("Login required")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}


// VALIDATION

const clientName = get("clientName")?.value.trim() || ""
const clientPhone = get("clientPhone")?.value.trim() || ""
const startDate = get("startDate")?.value || ""

const eventCategory =
get("eventCategory")?.value || ""

if(!clientName){

alert("Enter client name")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}

if(!clientPhone){

alert("Enter client phone")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}

if(!startDate){

alert("Select event date")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return

}


// SOFT DOUBLE BOOKING WARNING

const existingEvents =
await checkEventLoad(startDate,user.id)

if(existingEvents > 0){

alert(
`⚠ ${existingEvents} event(s) already booked on this date`
)

}


// BUILD SERVICES

const services = {

candid:{
qty: parseInt(get("candidQty")?.value || 0),
days: parseInt(get("candidDays")?.value || 0)
},

traditional_photo:{
qty: parseInt(get("traditionalPhotoQty")?.value || 0),
days: parseInt(get("traditionalPhotoDays")?.value || 0)
},

traditional_video:{
qty: parseInt(get("traditionalVideoQty")?.value || 0),
days: parseInt(get("traditionalVideoDays")?.value || 0)
},

cinematographer:{
qty: parseInt(get("cinemaQty")?.value || 0),
days: parseInt(get("cinemaDays")?.value || 0)
},

drone:{
qty: parseInt(get("droneQty")?.value || 0),
days: parseInt(get("droneDays")?.value || 0)
},

led_wall:{
qty: parseInt(get("ledQty")?.value || 0),
days: parseInt(get("ledDays")?.value || 0)
},

assistant:{
qty: parseInt(get("assistantQty")?.value || 0),
days: parseInt(get("assistantDays")?.value || 0)
}

}


// BUILD DELIVERABLES

const deliverables = {

raw: get("rawCheck")?.checked || false,

traditional_video: get("traditionalCheck")?.checked || false,

cinematic: get("cinematicCheck")?.checked || false,

album:{
enabled: albumCheck?.checked || false,
pages: parseInt(albumPagesInput?.value || 0)
},

gift:{
enabled: giftCheck?.checked || false,
name: giftInput?.value || ""
}

}


// QUOTATION OBJECT

const quotationData = {

user_id: user.id,

client_name: clientName,
phone: clientPhone,

event_category: eventCategory,

event_date: startDate,
end_date: get("endDate")?.value || "",

package: packageSelect?.value || "",

total: parseFloat(totalInput?.value || 0),
advance: parseFloat(advanceInput?.value || 0),
balance: parseFloat(balanceInput?.value || 0),

status: "proposal",

services,
deliverables

}


// SAVE

const saved = await saveQuotation(quotationData)

if(!saved || !saved.id){

alert("Error saving quotation")

previewBtn.disabled = false
previewBtn.innerText = "Preview Quote"

return
}


// SHORT ID

const shortId = saved.id.substring(0,8)

await supabase
.from("quotations")
.update({ short_id: shortId })
.eq("id", saved.id)


// REDIRECT

const slug = slugify(clientName)

window.location.href =
"p/" + slug + "-" + shortId

})

}