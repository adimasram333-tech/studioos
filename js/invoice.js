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


function isAndroidDevice(){

return /Android/i.test(navigator.userAgent)

}

function isCapacitorNativeApp(){

try{

return !!(
window.Capacitor &&
typeof window.Capacitor.isNativePlatform === "function" &&
window.Capacitor.isNativePlatform()
)

}catch(error){

return false

}

}

function getCapacitorPlugins(){

try{

return window.Capacitor?.Plugins || {}

}catch(error){

return {}

}

}

function blobToBase64(blob){

return new Promise((resolve,reject)=>{

const reader = new FileReader()

reader.onloadend = function(){

try{

const result = String(reader.result || "")
const base64 = result.includes(",") ? result.split(",")[1] : result

if(!base64){
reject(new Error("Base64 conversion failed"))
return
}

resolve(base64)

}catch(error){
reject(error)
}

}

reader.onerror = function(){
reject(new Error("Blob read failed"))
}

reader.readAsDataURL(blob)

})

}

async function savePdfWithCapacitor(blob, fileName){

const safeFileName =
String(fileName || "invoice.pdf")
.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
.trim() || "invoice.pdf"

const base64Data = await blobToBase64(blob)

// StudioOS native saver is the production path inside Android app.
// It saves the invoice PDF to Downloads/StudioOS through MediaStore.
const studioOSSaver = getStudioOSFileSaverPlugin()

if(studioOSSaver && typeof studioOSSaver.saveFile === "function"){

await studioOSSaver.saveFile({
base64Data,
fileName: safeFileName,
mimeType: "application/pdf",
target: "downloads"
})

return true

}

// Legacy fallback kept only for older builds that still include Capacitor Filesystem.
const plugins = getCapacitorPlugins()
const Filesystem = plugins.Filesystem

if(!Filesystem || typeof Filesystem.writeFile !== "function"){
throw new Error("StudioOS file saver is not available")
}

const directory =
Filesystem.Directory?.Documents ||
Filesystem.Directory?.Data ||
"DOCUMENTS"

await Filesystem.writeFile({
path: safeFileName,
data: base64Data,
directory,
recursive: true
})

return true

}

async function openPdfPreviewFallback(blob, fileName){

const blobUrl = URL.createObjectURL(blob)

try{

const opened = window.open(blobUrl, "_blank", "noopener")

if(!opened){
triggerObjectUrlDownload(blob, fileName)
}

setTimeout(()=>{
URL.revokeObjectURL(blobUrl)
}, 30000)

return true

}catch(error){

setTimeout(()=>{
URL.revokeObjectURL(blobUrl)
}, 30000)

throw error

}

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

if(isCapacitorNativeApp()){
try{
await savePdfWithCapacitor(blob, fileName)
return
}catch(error){
console.error("StudioOS native invoice save failed:", error)
throw error
}
}

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
// PDF LIBRARY LOADER
// =============================

const STUDIOOS_HTML2PDF_SRC =
"https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"

let studioOSInvoiceHtml2PdfLoadPromise = null

async function ensureInvoiceHtml2PdfLoaded(){

if(typeof window.html2pdf === "function"){
return true
}

if(studioOSInvoiceHtml2PdfLoadPromise){
return await studioOSInvoiceHtml2PdfLoadPromise
}

studioOSInvoiceHtml2PdfLoadPromise = new Promise((resolve,reject)=>{

const existingScript =
document.querySelector('script[data-studioos-invoice-html2pdf="true"]') ||
Array.from(document.scripts || []).find(script =>
String(script.src || "").includes("html2pdf")
)

if(existingScript){

existingScript.addEventListener("load", function(){
if(typeof window.html2pdf === "function"){
resolve(true)
}else{
reject(new Error("PDF library loaded but not initialized"))
}
}, { once:true })

existingScript.addEventListener("error", function(){
reject(new Error("PDF library failed to load"))
}, { once:true })

if(typeof window.html2pdf === "function"){
resolve(true)
}

return

}

const script = document.createElement("script")
script.src = STUDIOOS_HTML2PDF_SRC
script.async = true
script.defer = true
script.dataset.studioosInvoiceHtml2pdf = "true"

script.onload = function(){
if(typeof window.html2pdf === "function"){
resolve(true)
return
}

reject(new Error("PDF library loaded but not initialized"))
}

script.onerror = function(){
reject(new Error("PDF library failed to load. Please check internet connection and try again."))
}

document.head.appendChild(script)

})

try{
return await studioOSInvoiceHtml2PdfLoadPromise
}catch(error){
studioOSInvoiceHtml2PdfLoadPromise = null
throw error
}

}

function getStudioOSFileSaverPlugin(){

try{
return window.Capacitor?.Plugins?.StudioOSFileSaver || null
}catch(error){
return null
}

}

function showInvoiceStatus(message){

try{
const downloadBtn = document.getElementById("downloadInvoice")

if(downloadBtn && message){
downloadBtn.dataset.statusText = message
}

}catch(error){}

}


// =============================
// BUILD PDF BLOB
// =============================

async function buildInvoicePdfBlob(){

await ensureInvoiceHtml2PdfLoaded()

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
window.html2pdf().set(opt).from(element)

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

if(isCapacitorNativeApp()){
alert("Invoice saved to Downloads/StudioOS")
return
}

if(isIOSDevice()){
setTimeout(()=>{
alert("Agar iPhone/iPad browser preview khole, to browser menu se Save to Files ya Download option use karein.")
}, 500)
}

if(isAndroidDevice() && !isCapacitorNativeApp()){
setTimeout(()=>{
alert("Agar Android browser preview khole, to browser menu se Download/Save option use karein.")
}, 500)
}

}catch(error){

console.error("Invoice download error:", error)
alert(error?.message || "Invoice PDF download failed")

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