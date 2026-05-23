// =============================
// TOKEN MODULE (PRODUCTION PREMIUM MODAL)
// =============================

window.showToken = async function(eventId){

const menu = document.getElementById("floatingMenu")
if(menu) menu.remove()

if(typeof guardPublicGalleryFeature !== "function"){
console.error("Public gallery subscription guard missing")

if(typeof showStudioOSInfo === "function"){
await showStudioOSInfo("Unable to verify gallery access. Please try again.", "Gallery Token")
}else{
alert("Unable to verify gallery access. Please try again.")
}

return
}

const allowed = await guardPublicGalleryFeature(eventId, "sharing")
if(!allowed) return

if(typeof window.ensurePublicShareToken !== "function"){
console.error("Public share token helper missing")

if(typeof showStudioOSInfo === "function"){
await showStudioOSInfo("Unable to generate token. Please try again.", "Gallery Token")
}else{
alert("Unable to generate token. Please try again.")
}

return
}

const token = await window.ensurePublicShareToken(eventId)

if(!token){

if(typeof showStudioOSInfo === "function"){
await showStudioOSInfo("Unable to generate token. Please try again.", "Gallery Token")
}else{
alert("Unable to generate token. Please try again.")
}

return
}

const safeToken = String(token || "").trim()

const existingModal = document.getElementById("studioosGalleryTokenModal")
if(existingModal){
existingModal.remove()
}

const modal = document.createElement("div")
modal.id = "studioosGalleryTokenModal"
modal.style.position = "fixed"
modal.style.inset = "0"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.padding = "1rem"
modal.style.background = "rgba(2,6,23,0.72)"
modal.style.backdropFilter = "blur(10px)"
modal.style.webkitBackdropFilter = "blur(10px)"
modal.style.zIndex = "2147482400"

modal.innerHTML = `
<div style="
  width:min(100%, 380px);
  border-radius:1.35rem;
  padding:1.15rem;
  background:rgba(15,23,42,0.97);
  border:1px solid rgba(255,255,255,0.1);
  box-shadow:0 24px 70px rgba(0,0,0,0.4);
  color:white;
  text-align:center;
">
  <div style="
    display:inline-flex;
    align-items:center;
    min-height:30px;
    padding:0 0.78rem;
    border-radius:999px;
    background:rgba(99,102,241,0.16);
    border:1px solid rgba(99,102,241,0.32);
    color:rgb(199 210 254);
    font-size:0.72rem;
    font-weight:850;
    letter-spacing:0.08em;
    text-transform:uppercase;
  ">Gallery Token</div>

  <div style="
    margin-top:0.95rem;
    color:rgba(255,255,255,0.72);
    font-size:0.86rem;
    line-height:1.5;
  ">Share this token only with trusted clients.</div>

  <div id="studioosGalleryTokenValue" style="
    margin-top:0.95rem;
    padding:0.95rem 1rem;
    border-radius:1rem;
    background:rgba(99,102,241,0.14);
    border:1px solid rgba(99,102,241,0.28);
    color:#818cf8;
    font-size:1.85rem;
    line-height:1.1;
    font-weight:950;
    letter-spacing:0.08em;
    word-break:break-word;
  ">${safeToken.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>

  <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:1rem;">
    <button id="studioosGalleryTokenCloseBtn" type="button" style="
      min-height:46px;
      border-radius:0.95rem;
      background:rgba(255,255,255,0.06);
      color:white;
      border:1px solid rgba(255,255,255,0.1);
      font-size:0.88rem;
      font-weight:800;
      cursor:pointer;
    ">Close</button>

    <button id="studioosGalleryTokenCopyBtn" type="button" style="
      min-height:46px;
      border-radius:0.95rem;
      background:rgb(79 70 229);
      color:white;
      border:1px solid transparent;
      font-size:0.88rem;
      font-weight:850;
      cursor:pointer;
      box-shadow:0 14px 30px rgba(79,70,229,0.25);
    ">Copy</button>
  </div>
</div>
`

document.body.appendChild(modal)

const closeModal = ()=>{
modal.remove()
}

modal.addEventListener("click", function(event){
if(event.target === modal){
closeModal()
}
})

const closeBtn = document.getElementById("studioosGalleryTokenCloseBtn")
const copyBtn = document.getElementById("studioosGalleryTokenCopyBtn")

if(closeBtn){
closeBtn.onclick = closeModal
}

if(copyBtn){
copyBtn.onclick = async function(){
try{
if(typeof copyTextToClipboard === "function"){
await copyTextToClipboard(safeToken)
}else if(navigator.clipboard && navigator.clipboard.writeText){
await navigator.clipboard.writeText(safeToken)
}

if(typeof showStudioOSToast === "function"){
showStudioOSToast("Token copied")
}else{
console.log("Token copied")
}
}catch(error){
console.error("Token copy failed:", error)

if(typeof showStudioOSToast === "function"){
showStudioOSToast("Token copy failed", "error")
}else{
alert("Token copy failed")
}
}
}
}

}
