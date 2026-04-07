// =============================
// GET CURRENT USER
// =============================

async function getCurrentUser(){

const supabase = await window.getSupabase()

const { data:{ user } } =
await supabase.auth.getUser()

return user

}


// =============================
// GET QUOTATION ID
// =============================

function getQuotationId(){

const params =
new URLSearchParams(window.location.search)

return params.get("quotation")

}


// =============================
// FORMAT DATE
// =============================

function formatDate(dateString){

if(!dateString) return "-"

const date = new Date(dateString)

return date.toLocaleDateString("en-IN",{
day:"numeric",
month:"short",
year:"numeric"
})

}


// =============================
// FORMAT CURRENCY
// =============================

function formatCurrency(amount){

return new Intl.NumberFormat("en-IN",{
style:"currency",
currency:"INR",
maximumFractionDigits:0
}).format(amount)

}


// =============================
// LOAD STUDIO
// =============================

async function loadStudio(){

const supabase = await window.getSupabase()

const user = await getCurrentUser()

if(!user) return

const { data } =
await supabase
.from("photographer_settings")
.select("*")
.eq("user_id",user.id)
.single()

if(!data) return

document.getElementById("studioName").innerText =
data.studio_name || "Studio"

document.getElementById("studioPhone").innerText =
data.phone || "-"

document.getElementById("studioEmail").innerText =
data.email || "-"

document.getElementById("photographerName").innerText =
data.studio_name || "Photographer"

}


// =============================
// EXTRACT LAST INVOICE NUMBER
// =============================

function extractInvoiceSequence(invoiceNumber){

if(!invoiceNumber || typeof invoiceNumber !== "string"){
return 0
}

const match = invoiceNumber.match(/INV-\d{4}-(\d{4,})$/)

if(!match) return 0

const sequence = parseInt(match[1],10)

return Number.isFinite(sequence) ? sequence : 0

}


// =============================
// GENERATE UNIQUE INVOICE NUMBER
// =============================

async function getOrCreateInvoiceNumber(supabase, userId, quotationId, currentInvoiceNumber){

if(currentInvoiceNumber){
return currentInvoiceNumber
}

const year = new Date().getFullYear()

const { data: existingNumbers, error: existingError } =
await supabase
.from("quotations")
.select("id, invoice_number, user_id, created_at")
.eq("user_id", userId)
.not("invoice_number","is",null)

if(existingError){
console.error("Invoice fetch error:", existingError)
throw existingError
}

let maxSequence = 0

if(existingNumbers && existingNumbers.length > 0){
existingNumbers.forEach((row)=>{
const sequence = extractInvoiceSequence(row.invoice_number)
if(sequence > maxSequence){
maxSequence = sequence
}
})
}

const nextSequence = maxSequence + 1

const newInvoiceNumber =
`INV-${year}-${String(nextSequence).padStart(4,"0")}`

const { error: updateError } =
await supabase
.from("quotations")
.update({
invoice_number: newInvoiceNumber
})
.eq("id", quotationId)
.eq("user_id", userId)

if(updateError){
console.error("Invoice update error:", updateError)
throw updateError
}

return newInvoiceNumber

}


// =============================
// LOAD INVOICE
// =============================

async function loadInvoice(){

const supabase = await window.getSupabase()

const quotationId = getQuotationId()

if(!quotationId) return

const user = await getCurrentUser()

if(!user) return

const { data: quote } =
await supabase
.from("quotations")
.select("*")
.eq("id",quotationId)
.eq("user_id",user.id)
.single()

if(!quote) return

document.getElementById("clientName").innerText =
quote.client_name || "-"

document.getElementById("clientPhone").innerText =
quote.phone || "-"

document.getElementById("invoiceDate").innerText =
formatDate(quote.created_at)

const eventType =
quote.event_category ||
quote.event_type ||
quote.event_name ||
"-"

document.getElementById("eventType").innerText =
eventType

document.getElementById("eventVenue").innerText =
quote.venue || "-"

const startDate =
quote.event_start_date ||
quote.event_date

const endDate =
quote.event_end_date ||
quote.end_date ||
quote.event_date

document.getElementById("eventStart").innerText =
formatDate(startDate)

document.getElementById("eventEnd").innerText =
formatDate(endDate)

const total = Number(quote.total || 0)

document.getElementById("invoiceTotal").innerText =
formatCurrency(total)

document.getElementById("invoiceTotalFooter").innerText =
formatCurrency(total)

const { data: payments } =
await supabase
.from("payments")
.select("*")
.eq("quotation_id", quotationId)
.order("payment_date",{ascending:true})

const container =
document.getElementById("invoicePayments")

let paid = 0

if(!payments || payments.length === 0){

container.innerHTML =
"<p class='text-gray-500 text-sm'>No payments yet</p>"

}else{

container.innerHTML = ""

payments.forEach(p=>{

paid += Number(p.amount || 0)

const row =
document.createElement("div")

row.className =
"flex justify-between border-b py-2 text-sm"

row.innerHTML = `

<div>
<strong>${formatCurrency(p.amount)}</strong>
<span class="text-gray-500 ml-2">
${p.payment_type || ""} • ${p.method || ""}
</span>
</div>

<div class="text-gray-500">
${formatDate(p.payment_date)}
</div>

`

container.appendChild(row)

})

}

document.getElementById("invoicePaid").innerText =
formatCurrency(paid)

document.getElementById("invoicePaidFooter").innerText =
formatCurrency(paid)

const balance =
total - paid

document.getElementById("invoiceBalance").innerText =
formatCurrency(balance)

document.getElementById("invoiceBalanceFooter").innerText =
formatCurrency(balance)


// =============================
// PROFESSIONAL INVOICE NUMBER
// =============================

let invoiceNumber = quote.invoice_number

try{

invoiceNumber = await getOrCreateInvoiceNumber(
supabase,
user.id,
quotationId,
invoiceNumber
)

}catch(error){

console.error("Invoice number generation failed:", error)

if(!invoiceNumber){
invoiceNumber = `INV-${new Date().getFullYear()}-0001`
}

}

document.getElementById("invoiceNumber").innerText =
invoiceNumber

}


// =============================
// FILE NAME HELPER
// =============================

function getInvoiceFileName(){

const clientName =
(document.getElementById("clientName")?.innerText || "client")
.replace(/\s+/g,"-")
.replace(/[^a-zA-Z0-9-_]/g,"")
.toLowerCase()

const invoiceNumber =
(document.getElementById("invoiceNumber")?.innerText || "invoice")
.replace(/\s+/g,"-")
.replace(/[^a-zA-Z0-9-_]/g,"")

return `invoice-${clientName}-${invoiceNumber}.pdf`

}


// =============================
// DEVICE HELPERS
// =============================

function isIOSDevice(){

return /iPhone|iPad|iPod/i.test(navigator.userAgent)

}


// =============================
// DIRECT DOWNLOAD HELPERS
// =============================

function triggerObjectUrlDownload(blob, fileName){

const blobUrl = URL.createObjectURL(blob)

const link = document.createElement("a")
link.href = blobUrl
link.download = fileName
link.rel = "noopener"
link.style.display = "none"

document.body.appendChild(link)
link.click()
document.body.removeChild(link)

setTimeout(()=>{
URL.revokeObjectURL(blobUrl)
}, 10000)

}

function triggerDataUrlDownload(blob, fileName){

return new Promise((resolve,reject)=>{

const reader = new FileReader()

reader.onloadend = function(){

try{

const link = document.createElement("a")
link.href = reader.result
link.download = fileName
link.rel = "noopener"
link.style.display = "none"

document.body.appendChild(link)
link.click()
document.body.removeChild(link)

resolve()

}catch(error){
reject(error)
}

}

reader.onerror = function(){
reject(new Error("Data URL conversion failed"))
}

reader.readAsDataURL(blob)

})

}

async function triggerBestDownload(blob, fileName){

if(window.navigator && typeof window.navigator.msSaveOrOpenBlob === "function"){
window.navigator.msSaveOrOpenBlob(blob, fileName)
return
}

try{
triggerObjectUrlDownload(blob, fileName)
}catch(error){
console.warn("Object URL download failed, trying data URL fallback:", error)
await triggerDataUrlDownload(blob, fileName)
}

}


// =============================
// BUILD PDF BLOB
// =============================

async function buildInvoicePdfBlob(){

window.scrollTo(0,0)

const element =
document.getElementById("invoiceContainer")

if(!element){
throw new Error("Invoice container not found")
}

const fileName = getInvoiceFileName()

const opt = {
margin:0,
filename:fileName,
image:{
type:"jpeg",
quality:1
},
html2canvas:{
scale:2,
useCORS:true,
scrollY:0
},
jsPDF:{
unit:"mm",
format:[210,297],
orientation:"portrait"
}
}

const worker =
html2pdf().set(opt).from(element)

const pdfBlob =
await worker.outputPdf("blob")

return {
blob: pdfBlob,
fileName
}

}


// =============================
// DOWNLOAD PDF
// =============================

async function downloadInvoice(){

const downloadBtn =
document.getElementById("downloadInvoice")

if(downloadBtn){
downloadBtn.disabled = true
downloadBtn.innerText = "Preparing PDF..."
}

try{

const { blob, fileName } = await buildInvoicePdfBlob()

await triggerBestDownload(blob, fileName)

if(isIOSDevice()){
setTimeout(()=>{
alert("Agar iPhone/iPad browser preview khole, to browser menu se Save to Files ya Download option use karein.")
}, 500)
}

}catch(error){

console.error("Invoice download error:", error)
alert("Invoice PDF download failed")

}finally{

if(downloadBtn){
downloadBtn.disabled = false
downloadBtn.innerText = "Download Invoice"
}

}

}


// =============================
// INIT
// =============================

document
.getElementById("downloadInvoice")
.addEventListener("click",downloadInvoice)

loadStudio()
loadInvoice()