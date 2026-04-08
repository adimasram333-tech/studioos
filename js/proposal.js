// ======================
// GET QUOTATION ID
// ======================

let quotationId = null

const params = new URLSearchParams(window.location.search)

if(params.get("id")){
quotationId = params.get("id")
}


// ======================
// SUPPORT SLUG QUERY
// ======================

let shortId = null

if(params.get("slug")){

const slug = params.get("slug")

if(slug && slug.includes("-")){
const slugParts = slug.split("-")
shortId = slugParts[slugParts.length - 1]
}

}


// ======================
// SUPPORT SEO LINK
// ======================

if(!quotationId && !shortId){

const pathParts = window.location.pathname.split("/").filter(Boolean)

const lastPart = pathParts[pathParts.length - 1]

if(lastPart && lastPart.includes("-")){

const slugParts = lastPart.split("-")
shortId = slugParts[slugParts.length - 1]

}

}


// ======================
// FORMAT MONEY
// ======================

function formatMoney(num){
return "₹ " + Number(num || 0).toLocaleString("en-IN") + "/-"
}


// ======================
// FORMAT DATE
// ======================

function formatDate(dateStr){

if(!dateStr) return "-"

const parts = dateStr.split("-")

if(parts.length !== 3) return dateStr

return parts[2] + "-" + parts[1] + "-" + parts[0]

}


// ======================
// WAIT FOR SUPABASE
// ======================

async function waitForSupabase(){

let tries = 0

while(!window.getSupabase && tries < 50){
await new Promise(r => setTimeout(r,100))
tries++
}

}


// ======================
// PLAN CHECK
// ======================

function isPremiumUser(profile){
return (
profile?.plan === "pro" ||
profile?.plan === "paid" ||
profile?.subscription === "pro" ||
profile?.subscription === "paid" ||
profile?.is_pro === true ||
profile?.is_paid === true
)
}


// ======================
// HERO TITLE TEXT
// ======================

function getProposalTitle(data){
let category = data?.event_category || "Photography"
return category + " Photography Proposal"
}


// ======================
// EVENT DATE TEXT
// ======================

function getEventDateText(data){

if(data?.event_date && data?.end_date){
return formatDate(data.event_date) + " → " + formatDate(data.end_date)
}

return formatDate(data?.event_date)

}


// ======================
// PARSE SERVICES
// ======================

function parseServices(services){

let parsed = services || {}

if(typeof parsed === "string"){
try{
parsed = JSON.parse(parsed)
}catch(e){
parsed = {}
}
}

return parsed

}


// ======================
// PARSE DELIVERABLES
// ======================

function parseDeliverables(deliverables){

let parsed = deliverables || {}

if(typeof parsed === "string"){
try{
parsed = JSON.parse(parsed)
}catch(e){
parsed = {}
}
}

return parsed

}


// ======================
// SAFE HTML
// ======================

function escapeHtml(value){
return String(value || "")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;")
}


// ======================
// PREMIUM SERVICES HTML
// ======================

function buildPremiumServicesHtml(services){

const serviceMap = [
{ key:"candid", label:"Candid Photographer" },
{ key:"traditional_photo", label:"Traditional Photographer" },
{ key:"traditional_video", label:"Traditional Videographer" },
{ key:"cinematographer", label:"Cinematographer" },
{ key:"drone", label:"Drone" },
{ key:"led_wall", label:"LED Screen Wall" },
{ key:"assistant", label:"Assistant" }
]

return serviceMap.map((item) => {
const row = services[item.key] || {}
const qty = row.qty || 0
const days = row.days || 0

return `
<div class="premium-row">
  <span>${escapeHtml(item.label)}</span>
  <span>${qty} x ${days} Days</span>
</div>
`
}).join("")

}


// ======================
// PREMIUM DELIVERABLES HTML
// ======================

function buildPremiumDeliverablesHtml(deliverables){

let html = ""

if(deliverables.raw){
html += `<li>All Raw Soft Copy</li>`
}

if(deliverables.traditional_video){
html += `<li>Traditional Full Event Video</li>`
}

if(deliverables.cinematic){
html += `<li>Cinematic Highlight Film</li>`
}

if(deliverables.album?.enabled){
html += `<li>Premium Printed Album (${deliverables.album.pages || 0} Pages)</li>`
}

if(deliverables.gift?.enabled){
html += `<li>Complimentary Gift : ${escapeHtml(deliverables.gift.name || "-")}</li>`
}

if(!html){
html = `<li>Deliverables will be shared as per final package confirmation.</li>`
}

return html

}


// ======================
// APPLY PREMIUM STYLES
// ======================

function injectPremiumStyles(){

if(document.getElementById("premium-proposal-styles")) return

const style = document.createElement("style")
style.id = "premium-proposal-styles"
style.innerHTML = `
:root{
--premium-bg:#0f172a;
--premium-card:rgba(255,255,255,0.08);
--premium-border:rgba(255,255,255,0.12);
--premium-text:#ffffff;
--premium-muted:rgba(255,255,255,0.75);
--premium-soft:rgba(255,255,255,0.55);
--premium-accent:#c78d82;
}
html, body{
margin:0;
padding:0;
}
body{
background:var(--premium-bg);
font-family:'Inter',sans-serif;
color:var(--premium-text);
-webkit-print-color-adjust:exact;
print-color-adjust:exact;
}
#proposalPage{
width:100%;
max-width:100%;
margin:0;
}
.premium-shell{
min-height:100vh;
background:linear-gradient(180deg,#0f172a 0%,#111827 100%);
}
.premium-page{
width:100%;
max-width:1120px;
margin:0 auto;
padding-bottom:40px;
}
.premium-hero{
position:relative;
height:320px;
overflow:hidden;
}
.premium-hero-image{
position:absolute;
inset:0;
width:100%;
height:100%;
object-fit:cover;
}
.premium-hero-overlay{
position:absolute;
inset:0;
background:linear-gradient(to bottom,rgba(0,0,0,0.28),rgba(0,0,0,0.70));
}
.premium-hero-content{
position:relative;
z-index:2;
height:100%;
display:flex;
flex-direction:column;
justify-content:center;
align-items:center;
text-align:center;
padding:20px;
}
.premium-title{
margin:0;
font-family:'Playfair Display',serif;
font-size:42px;
line-height:1.15;
letter-spacing:0.02em;
}
.premium-studio{
margin-top:14px;
font-size:18px;
font-weight:600;
}
.premium-phone{
margin-top:6px;
font-size:14px;
color:var(--premium-muted);
}
.premium-content{
max-width:960px;
margin:-48px auto 0;
padding:0 16px;
position:relative;
z-index:3;
}
.premium-card{
background:var(--premium-card);
backdrop-filter:blur(16px);
border:1px solid var(--premium-border);
border-radius:22px;
padding:20px;
box-shadow:0 10px 35px rgba(0,0,0,0.18);
}
.premium-grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:16px;
}
.premium-info{
display:flex;
justify-content:space-between;
gap:16px;
padding:14px 16px;
border-radius:16px;
background:rgba(255,255,255,0.05);
border:1px solid rgba(255,255,255,0.08);
}
.premium-info span:first-child{
color:var(--premium-soft);
}
.premium-section{
margin-top:18px;
}
.premium-section-title{
margin:0 0 14px 0;
font-family:'Playfair Display',serif;
font-size:24px;
line-height:1.2;
}
.premium-two-col{
display:grid;
grid-template-columns:1.2fr .8fr;
gap:18px;
margin-top:18px;
}
.premium-panel{
background:var(--premium-card);
backdrop-filter:blur(16px);
border:1px solid var(--premium-border);
border-radius:22px;
padding:20px;
}
.premium-row{
display:flex;
justify-content:space-between;
gap:16px;
padding:12px 0;
border-bottom:1px solid rgba(255,255,255,0.10);
font-size:15px;
}
.premium-row:last-child{
border-bottom:none;
}
.premium-row span:first-child{
color:var(--premium-muted);
}
.premium-list{
margin:0;
padding-left:18px;
line-height:1.85;
color:var(--premium-muted);
}
.premium-summary-row{
display:flex;
justify-content:space-between;
gap:16px;
padding:10px 0;
border-bottom:1px solid rgba(255,255,255,0.10);
}
.premium-summary-row:last-child{
border-bottom:none;
}
.premium-summary-row strong:last-child{
font-weight:700;
}
.premium-copy{
margin-top:18px;
color:var(--premium-muted);
line-height:1.8;
font-size:15px;
}
.premium-copy ul{
margin:10px 0 0;
padding-left:18px;
}
.premium-actions{
margin-top:20px;
display:grid;
grid-template-columns:1fr 1fr;
gap:12px;
}
.premium-btn{
border:none;
border-radius:14px;
padding:14px 18px;
font-size:14px;
font-weight:600;
cursor:pointer;
transition:.2s ease;
}
.premium-btn-whatsapp{
background:#25D366;
color:white;
}
.premium-btn-whatsapp:hover{
opacity:.92;
}
.premium-btn-pdf{
background:var(--premium-accent);
color:white;
}
.premium-btn-pdf:hover{
opacity:.92;
}
.premium-footer{
margin-top:26px;
text-align:center;
font-size:12px;
color:var(--premium-soft);
}
@media (max-width: 1024px){
.premium-title{
font-size:34px;
}
.premium-two-col{
grid-template-columns:1fr;
}
}
@media (max-width: 768px){
.premium-page{
padding-bottom:24px;
}
.premium-hero{
height:260px;
}
.premium-hero-content{
padding:18px;
}
.premium-title{
font-size:25px;
}
.premium-studio{
font-size:16px;
}
.premium-phone{
font-size:13px;
}
.premium-content{
margin:-28px auto 0;
padding:0 12px;
}
.premium-card,
.premium-panel{
padding:16px;
border-radius:18px;
}
.premium-grid{
grid-template-columns:1fr;
gap:12px;
}
.premium-info{
padding:12px 14px;
font-size:14px;
}
.premium-section-title{
font-size:21px;
}
.premium-row{
font-size:14px;
flex-direction:column;
align-items:flex-start;
gap:4px;
}
.premium-summary-row{
font-size:14px;
}
.premium-actions{
grid-template-columns:1fr;
}
.premium-btn{
width:100%;
}
}
@page{
size:A4;
margin:0;
}
@media print{
body{
background:#ffffff !important;
}
.premium-shell{
background:#ffffff !important;
}
.premium-page{
max-width:100% !important;
}
.premium-content{
margin:0 !important;
padding:0 !important;
max-width:100% !important;
}
.premium-card,
.premium-panel{
box-shadow:none !important;
break-inside:avoid;
page-break-inside:avoid;
}
.premium-actions{
display:none !important;
}
}
`
document.head.appendChild(style)

}


// ======================
// RENDER PREMIUM PROPOSAL
// ======================

function renderPremiumProposal(data, profile, services, deliverables){

injectPremiumStyles()

const page = document.getElementById("proposalPage")

if(!page) return

const coverImage =
profile?.team_sheet_cover_image ||
"https://images.unsplash.com/photo-1519741497674-611481863552"

const accentColor =
profile?.team_sheet_title_color || "#c78d82"

const proposalTitle = getProposalTitle(data)
const eventDateText = getEventDateText(data)

page.className = ""
page.innerHTML = `
<div class="premium-shell">
  <div class="premium-page">

    <div class="premium-hero">
      <img class="premium-hero-image" src="${escapeHtml(coverImage)}" alt="Proposal Cover">
      <div class="premium-hero-overlay"></div>

      <div class="premium-hero-content">
        <h1 class="premium-title" style="color:${escapeHtml(accentColor)}">${escapeHtml(proposalTitle)}</h1>
        <div class="premium-studio">${escapeHtml(profile?.studio_name || "")}</div>
        <div class="premium-phone">${escapeHtml(profile?.phone || "")}</div>
      </div>
    </div>

    <div class="premium-content">

      <div class="premium-card">
        <div class="premium-grid">
          <div class="premium-info">
            <span>Prepared For</span>
            <span>${escapeHtml(data.client_name || "")}</span>
          </div>

          <div class="premium-info">
            <span>Event Dates</span>
            <span>${escapeHtml(eventDateText)}</span>
          </div>
        </div>
      </div>

      <div class="premium-two-col">

        <div class="premium-panel">
          <h2 class="premium-section-title">Services & Coverage</h2>
          ${buildPremiumServicesHtml(services)}
        </div>

        <div class="premium-panel">
          <h2 class="premium-section-title">Investment Summary</h2>

          <div class="premium-summary-row">
            <strong>Total Investment</strong>
            <strong>${escapeHtml(formatMoney(data.total))}</strong>
          </div>

          <div class="premium-summary-row">
            <strong>Advance Required</strong>
            <strong>${escapeHtml(formatMoney(data.advance))}</strong>
          </div>

          <div class="premium-summary-row">
            <strong>Balance</strong>
            <strong>${escapeHtml(formatMoney(data.balance))}</strong>
          </div>
        </div>

      </div>

      <div class="premium-panel premium-section">
        <h2 class="premium-section-title">Deliverables</h2>
        <ul class="premium-list">
          ${buildPremiumDeliverablesHtml(deliverables)}
        </ul>
      </div>

      <div class="premium-panel premium-section">
        <h2 class="premium-section-title">Why Choose Us</h2>

        <div class="premium-copy">
          We believe every celebration has a story worth preserving forever.
          Our team focuses on capturing real emotions, beautiful details, and timeless moments.

          <ul>
            <li>Professional and experienced photography team</li>
            <li>Creative cinematic storytelling approach</li>
            <li>High quality editing and color grading</li>
            <li>Premium album design and printing</li>
            <li>Reliable service and timely delivery</li>
          </ul>
        </div>
      </div>

      <div class="premium-panel premium-section">
        <h2 class="premium-section-title">Booking Terms</h2>

        <div class="premium-copy">
          <ul>
            <li>Booking will be confirmed only after advance payment.</li>
            <li>Event date will be reserved only after confirmation.</li>
            <li>Remaining balance must be cleared before final delivery.</li>
            <li>Delivery timeline may vary depending on project scope.</li>
            <li>Any additional services will be charged separately.</li>
          </ul>
        </div>

        <div class="premium-actions">
          <button class="premium-btn premium-btn-whatsapp" onclick="sendWhatsApp()">Send Proposal on WhatsApp</button>
          <button class="premium-btn premium-btn-pdf" onclick="downloadPDF()">Download Proposal PDF</button>
        </div>

        <div class="premium-footer">
          <p><strong>Generated by StudioOS</strong></p>
          <p>Professional Photography Business Operating System</p>
        </div>
      </div>

    </div>

  </div>
</div>
`

}


// ======================
// LOAD PROPOSAL
// ======================

async function loadProposal(){

await waitForSupabase()

const supabase = await window.getSupabase()

let data = null


// ======================
// GET CURRENT USER (SAFE)
// ======================

let user = null
try{
const res = await supabase.auth.getUser()
user = res?.data?.user || null
}catch(e){
console.log("User fetch error", e)
}


// ======================
// LOAD QUOTATION
// ======================

if(quotationId){

const { data: row } = await supabase
.from("quotations")
.select("*")
.eq("id", quotationId)
.maybeSingle()

if(row){
data = row
}

}

if(!data && shortId){

const { data: row } = await supabase
.from("quotations")
.select("*")
.eq("short_id", shortId)
.maybeSingle()

if(row){
data = row
quotationId = row.id
}

}


// ======================
// SAFE DATA CHECK
// ======================

if(!data){

console.warn("Proposal not found:", quotationId || shortId)

const page = document.getElementById("proposalPage")

if(page){
page.innerHTML =
"<h2 style='text-align:center;margin-top:40px'>Proposal not available</h2>"
}

return

}


// ======================
// LOAD STUDIO PROFILE
// ======================

let profile = null

try{

const { data: row } =
await supabase
.from("photographer_settings")
.select("*")
.eq("user_id", data.user_id)
.maybeSingle()

if(row){
profile = row
}

}catch(e){
console.log("Profile load error",e)
}


// ======================
// THEME ENGINE
// ======================

if(profile){

const theme = profile.theme || "gold"

const themeLink = document.getElementById("theme-style")

if(themeLink){
themeLink.href = "themes/" + theme + ".css"
}

}


// ======================
// DATA PARSE
// ======================

const services = parseServices(data.services)
const deliverables = parseDeliverables(data.deliverables)


// ======================
// PREMIUM SWITCH
// ======================

if(isPremiumUser(profile)){
renderPremiumProposal(data, profile, services, deliverables)
}


// ======================
// LOAD STUDIO INFO
// ======================

const studioNameEl = document.getElementById("studioName")
const studioPhoneEl = document.getElementById("studioPhone")

let studioName = ""
let studioPhone = ""

if(profile){
studioName = profile.studio_name || ""
studioPhone = profile.phone || ""
}

if(studioNameEl){
studioNameEl.textContent = studioName
}

if(studioPhoneEl){
studioPhoneEl.textContent = studioPhone
}


// ======================
// HERO TITLE
// ======================

const heroTitle = document.querySelector(".hero h1")

if(heroTitle){
heroTitle.innerText = getProposalTitle(data)
}


// ======================
// CLIENT INFO
// ======================

const clientNameEl = document.getElementById("clientName")

if(clientNameEl){
clientNameEl.innerText = data.client_name || ""
}


// ======================
// EVENT DATE
// ======================

const eventDateEl = document.getElementById("eventDate")

if(eventDateEl){
eventDateEl.innerText = getEventDateText(data)
}


// ======================
// MONEY
// ======================

const totalEl = document.getElementById("total")
const advanceEl = document.getElementById("advance")
const balanceEl = document.getElementById("balance")

if(totalEl){
totalEl.innerText = formatMoney(data.total)
}

if(advanceEl){
advanceEl.innerText = formatMoney(data.advance)
}

if(balanceEl){
balanceEl.innerText = formatMoney(data.balance)
}


// ======================
// SERVICES
// ======================

function setService(id,value){
const el = document.getElementById(id)
if(el){
el.innerText = value
}
}

setService("candidQty",
(services.candid?.qty || 0) + " x " + (services.candid?.days || 0) + " Days")

setService("traditionalPhotoQty",
(services.traditional_photo?.qty || 0) + " x " + (services.traditional_photo?.days || 0) + " Days")

setService("traditionalVideoQty",
(services.traditional_video?.qty || 0) + " x " + (services.traditional_video?.days || 0) + " Days")

setService("cinemaQty",
(services.cinematographer?.qty || 0) + " x " + (services.cinematographer?.days || 0) + " Days")

setService("droneQty",
(services.drone?.qty || 0) + " x " + (services.drone?.days || 0) + " Days")

setService("ledQty",
(services.led_wall?.qty || 0) + " x " + (services.led_wall?.days || 0) + " Days")

setService("assistantQty",
(services.assistant?.qty || 0) + " x " + (services.assistant?.days || 0) + " Days")


// ======================
// DELIVERABLES
// ======================

const list = document.getElementById("deliverablesList")

if(list){

list.innerHTML = ""

if(deliverables.raw)
list.innerHTML += "<li>All Raw Soft Copy</li>"

if(deliverables.traditional_video)
list.innerHTML += "<li>Traditional Full Event Video</li>"

if(deliverables.cinematic)
list.innerHTML += "<li>Cinematic Highlight Film</li>"

if(deliverables.album?.enabled)
list.innerHTML += "<li>Premium Printed Album (" + (deliverables.album.pages || 0) + " Pages)</li>"

if(deliverables.gift?.enabled)
list.innerHTML += "<li>Complimentary Gift : " + escapeHtml(deliverables.gift.name || "-") + "</li>"

}


// ======================
// WHATSAPP SHARE
// ======================

window.sendWhatsApp = function(){

const phone = data.phone || ""

let clientSlug =
(data.client_name || "")
.toLowerCase()
.replace(/[^a-z0-9 ]/g,"")
.replace(/\s+/g,"-")

const shortLink =
window.location.origin +
"/studioos/p/" +
clientSlug +
"-" +
(data.short_id || "")

const message =
`Hello ${data.client_name},

Your photography proposal is ready.

View your proposal:
${shortLink}

For booking contact:

${studioName}
Phone: ${studioPhone}

Powered by StudioOS`

const url =
"https://wa.me/91" + phone + "?text=" + encodeURIComponent(message)

window.open(url,"_blank")

}


// ======================
// PDF EXPORT
// ======================

window.downloadPDF = function(){

window.scrollTo(0,0)

const element = document.getElementById("proposalPage")

const opt = {

margin:0,
filename:"photography-proposal.pdf",

image:{ type:"jpeg", quality:1 },

html2canvas:{
scale:2,
useCORS:true,
scrollX:0,
scrollY:0
},

jsPDF:{
unit:"mm",
format:[210,297],
orientation:"portrait"
}

}

html2pdf().set(opt).from(element).save()

}

}

window.addEventListener("load", function(){
loadProposal()
})