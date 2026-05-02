// ======================
// GET QUOTATION ID (SAME SYSTEM)
// ======================

let quotationId = null

const params = new URLSearchParams(window.location.search)

if(params.get("id")){
quotationId = params.get("id")
}


// ======================
// SUPPORT SLUG
// ======================

let shortId = null

if(params.get("slug")){
const slug = params.get("slug")
if(slug && slug.includes("-")){
const parts = slug.split("-")
shortId = parts[parts.length - 1]
}
}


// ======================
// SUPPORT ROUTE /studioos/p/
// ======================

if(!quotationId && !shortId){

const pathParts = window.location.pathname.split("/").filter(Boolean)
const last = pathParts[pathParts.length - 1]

if(last && last.includes("-")){
const parts = last.split("-")
shortId = parts[parts.length - 1]
}

}


// ======================
// FORMAT HELPERS
// ======================

function formatMoney(num){
return "₹ " + Number(num || 0).toLocaleString("en-IN")
}

function formatDate(dateStr){
if(!dateStr) return "-"
const parts = dateStr.split("-")
if(parts.length !== 3) return dateStr
return parts[2] + "-" + parts[1] + "-" + parts[0]
}


// ======================
// WAIT SUPABASE
// ======================

async function waitForSupabase(){

let tries = 0

while(!window.getSupabase && tries < 50){
await new Promise(r => setTimeout(r,100))
tries++
}

}


// ======================
// PREMIUM PLAN GATE
// ======================

function normalizePlanValue(value){
return String(value || "").trim().toLowerCase()
}

function isActivePremiumProposalPlan(profile){
if(!profile) return false

const plan = normalizePlanValue(profile.plan)
const status = normalizePlanValue(profile.subscription_status)
const isPaid = profile.is_paid === true
const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0
const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now()

return isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro")
}

async function isCurrentViewerOwner(supabase, ownerId){
try{
const { data } = await supabase.auth.getUser()
const currentUserId = data?.user?.id || ""
return !!currentUserId && String(currentUserId) === String(ownerId)
}catch(e){
return false
}
}

function renderPremiumProposalLocked(isOwner = false){
const actionHtml = isOwner
? `
  <button onclick="window.location.href='subscription.html'" style="
    margin-top:18px;
    padding:12px 18px;
    border:none;
    border-radius:14px;
    background:#4f46e5;
    color:white;
    font-weight:700;
    cursor:pointer;
  ">View Plans</button>
`
: ""

document.body.innerHTML = `
  <div style="
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:radial-gradient(circle at top, #1e293b, #0f172a);
    color:white;
    font-family:Inter, sans-serif;
    text-align:center;
  ">
    <div style="
      width:min(100%, 420px);
      border-radius:24px;
      padding:24px;
      background:rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.12);
      box-shadow:0 24px 60px rgba(0,0,0,0.35);
    ">
      <div style="
        display:inline-flex;
        padding:6px 12px;
        border-radius:999px;
        background:rgba(79,70,229,0.18);
        color:#c7d2fe;
        font-size:12px;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
      ">Premium Feature</div>

      <h2 style="margin:16px 0 8px; font-size:24px; line-height:1.25;">
        Premium proposal is locked
      </h2>

      <p style="margin:0; color:rgba(255,255,255,0.72); line-height:1.65; font-size:14px;">
        Premium proposals are available on Basic and Pro plans.
      </p>

      ${actionHtml}
    </div>
  </div>
`
}


// ======================
// LOAD PROPOSAL
// ======================

async function loadPremiumProposal(){

await waitForSupabase()

const supabase = await window.getSupabase()

let data = null


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

if(!data){
document.body.innerHTML = "<h2 style='text-align:center;margin-top:40px'>Proposal not found</h2>"
return
}


// ======================
// LOAD PROFILE
// ======================

let profile = null

try{
const { data: row } = await supabase
.from("photographer_settings")
.select("*")
.eq("user_id", data.user_id)
.maybeSingle()

if(row){
profile = row
}
}catch(e){
console.log(e)
}

const premiumAllowed = isActivePremiumProposalPlan(profile)

if(!premiumAllowed){
const viewerIsOwner = await isCurrentViewerOwner(supabase, data.user_id)
renderPremiumProposalLocked(viewerIsOwner)
return
}


// ======================
// APPLY COVER IMAGE
// ======================

const cover = document.getElementById("coverImage")

if(profile?.team_sheet_cover_image){
cover.src = profile.team_sheet_cover_image
}


// ======================
// APPLY TITLE COLOR
// ======================

const title = document.getElementById("proposalTitle")

if(profile?.team_sheet_title_color){
title.style.color = profile.team_sheet_title_color
}


// ======================
// STUDIO INFO
// ======================

document.getElementById("studioName").innerText =
profile?.studio_name || ""

document.getElementById("studioPhone").innerText =
profile?.phone || ""


// ======================
// TITLE
// ======================

let category = data.event_category || "Photography"
title.innerText = category + " Proposal"


// ======================
// CLIENT INFO
// ======================

document.getElementById("clientName").innerText =
data.client_name || ""


// ======================
// DATE
// ======================

let eventDateText = "-"

if(data.event_date && data.end_date){
eventDateText =
formatDate(data.event_date) +
" → " +
formatDate(data.end_date)
}else{
eventDateText = formatDate(data.event_date)
}

document.getElementById("eventDate").innerText =
eventDateText


// ======================
// SERVICES
// ======================

let services = data.services || {}

if(typeof services === "string"){
try{
services = JSON.parse(services)
}catch(e){
services = {}
}
}

function set(id,val){
const el = document.getElementById(id)
if(el) el.innerText = val
}

set("candidQty",
(services.candid?.qty || 0) + " x " + (services.candid?.days || 0))

set("traditionalPhotoQty",
(services.traditional_photo?.qty || 0) + " x " + (services.traditional_photo?.days || 0))

set("traditionalVideoQty",
(services.traditional_video?.qty || 0) + " x " + (services.traditional_video?.days || 0))

set("cinemaQty",
(services.cinematographer?.qty || 0) + " x " + (services.cinematographer?.days || 0))

set("droneQty",
(services.drone?.qty || 0) + " x " + (services.drone?.days || 0))

set("ledQty",
(services.led_wall?.qty || 0) + " x " + (services.led_wall?.days || 0))

set("assistantQty",
(services.assistant?.qty || 0) + " x " + (services.assistant?.days || 0))


// ======================
// DELIVERABLES
// ======================

let deliverables = data.deliverables || {}

if(typeof deliverables === "string"){
try{
deliverables = JSON.parse(deliverables)
}catch(e){
deliverables = {}
}
}

const list = document.getElementById("deliverablesList")

if(list){

list.innerHTML = ""

if(deliverables.raw)
list.innerHTML += "<li>All Raw Soft Copy</li>"

if(deliverables.traditional_video)
list.innerHTML += "<li>Traditional Full Video</li>"

if(deliverables.cinematic)
list.innerHTML += "<li>Cinematic Film</li>"

if(deliverables.album?.enabled)
list.innerHTML += "<li>Album (" + (deliverables.album.pages || 0) + " Pages)</li>"

if(deliverables.gift?.enabled)
list.innerHTML += "<li>Gift: " + (deliverables.gift.name || "") + "</li>"

}


// ======================
// MONEY
// ======================

document.getElementById("total").innerText =
formatMoney(data.total)

document.getElementById("advance").innerText =
formatMoney(data.advance)

document.getElementById("balance").innerText =
formatMoney(data.balance)


// ======================
// WHATSAPP
// ======================

window.sendWhatsApp = function(){

const phone = data.phone || ""

const link =
window.location.href

const msg =
`Hello ${data.client_name},

Your premium photography proposal is ready:

${link}

${profile?.studio_name || ""}
${profile?.phone || ""}`

window.open(
"https://wa.me/91" + phone + "?text=" + encodeURIComponent(msg),
"_blank"
)

}


// ======================
// PDF
// ======================

window.downloadPDF = function(){

window.scrollTo(0,0)

const element = document.body

const opt = {
margin:0,
filename:"premium-proposal.pdf",
image:{ type:"jpeg", quality:1 },
html2canvas:{ scale:2 },
jsPDF:{ unit:"mm", format:[210,297] }
}

html2pdf().set(opt).from(element).save()

}

}

window.addEventListener("load", loadPremiumProposal)