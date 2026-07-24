// ================================
// StudioOS Android App Shell + Global Bottom Navigation
// Authenticated internal photographer app pages only
// ================================

(function(){

const NAV_ID = "studioosGlobalBottomNav"
const STYLE_ID = "studioosGlobalBottomNavStyle"

const INTERNAL_NAV_ITEMS = [
{
key: "home",
href: "dashboard.html",
label: "Home",
iconOutline: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M3 10.8 12 3l9 7.8v9.4a.8.8 0 0 1-.8.8h-5.1a.8.8 0 0 1-.8-.8v-5.1H9.7v5.1a.8.8 0 0 1-.8.8H3.8a.8.8 0 0 1-.8-.8v-9.4Z"/>
</svg>
`,
iconFilled: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M3 10.8 12 3l9 7.8v9.4a.8.8 0 0 1-.8.8h-5.1a.8.8 0 0 1-.8-.8v-5.1H9.7v5.1a.8.8 0 0 1-.8.8H3.8a.8.8 0 0 1-.8-.8v-9.4Z"/>
</svg>
`
},
{
key: "plans",
href: "subscription.html",
label: "Subscription Plans",
iconOutline: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4.5 6.2c0-1 .8-1.8 1.8-1.8h11.4c1 0 1.8.8 1.8 1.8v11.6c0 1-.8 1.8-1.8 1.8H6.3c-1 0-1.8-.8-1.8-1.8V6.2Zm3.2 2.1h8.6M7.7 12h8.6M7.7 15.7h5.4"/>
</svg>
`,
iconFilled: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6.3 4.4h11.4c1 0 1.8.8 1.8 1.8v11.6c0 1-.8 1.8-1.8 1.8H6.3c-1 0-1.8-.8-1.8-1.8V6.2c0-1 .8-1.8 1.8-1.8Zm1.4 3.9v1.6h8.6V8.3H7.7Zm0 3.7v1.6h8.6V12H7.7Zm0 3.7v1.6h5.4v-1.6H7.7Z"/>
</svg>
`
},
{
key: "events",
href: "events.html",
label: "Events",
iconOutline: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M7 3.8v2.4M17 3.8v2.4M4.8 9.2h14.4M6.3 5.5h11.4c1.1 0 2 .9 2 2v10.2c0 1.1-.9 2-2 2H6.3c-1.1 0-2-.9-2-2V7.5c0-1.1.9-2 2-2Zm3 7.2h.1M12 12.7h.1M14.7 12.7h.1M9.3 15.6h.1M12 15.6h.1M14.7 15.6h.1"/>
</svg>
`,
iconFilled: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M7 2.9c.55 0 1 .45 1 1v1h8v-1c0-.55.45-1 1-1s1 .45 1 1v1h.2c1.35 0 2.45 1.1 2.45 2.45v10.75c0 1.35-1.1 2.45-2.45 2.45H5.8c-1.35 0-2.45-1.1-2.45-2.45V7.35c0-1.35 1.1-2.45 2.45-2.45H6v-1c0-.55.45-1 1-1Zm-1.65 7.1v8.1c0 .25.2.45.45.45h12.4c.25 0 .45-.2.45-.45V10H5.35Zm3.95 2.5a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm2.7 0a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm2.7 0a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z"/>
</svg>
`
}
]

const PUBLIC_OR_AUTH_PAGES = new Set([
"",
"index.html",
"login.html",
"signup.html",
"reset-password.html",
"access.html",
"face-capture.html",
"proposal.html",
"proposal-premium.html",
"studio_route.html",
"404.html"
])

function getPageName(){
try{
const path = window.location.pathname || ""
return String(path.split("/").pop() || "").toLowerCase()
}catch(e){
return ""
}
}

function isAdminRoute(){
try{
return String(window.location.pathname || "").toLowerCase().includes("studioos-admin")
}catch(e){
return false
}
}

function isPublicOrAuthPage(){
return PUBLIC_OR_AUTH_PAGES.has(getPageName())
}

function isStudioOSNativeApp(){
try{
if(
window.Capacitor &&
typeof window.Capacitor.isNativePlatform === "function" &&
window.Capacitor.isNativePlatform()
){
return true
}

const protocol = String(window.location.protocol || "").toLowerCase()
return protocol === "capacitor:" || protocol === "file:"
}catch(e){
return false
}
}

function getCapacitorAppPlugin(){
try{
return window.Capacitor?.Plugins?.App || null
}catch(e){
return null
}
}

function getInternalFallbackPage(){
return "dashboard.html"
}

function isDashboardPage(){
return getPageName() === "dashboard.html"
}

function isInternalAppPage(){
return !isAdminRoute() && !isPublicOrAuthPage()
}

const INTERNAL_HISTORY_KEY = "studioos_internal_history_stack_v1"

function getNormalizedCurrentHref(){
try{
const page = getPageName() || "dashboard.html"
return page + String(window.location.search || "")
}catch(e){
return "dashboard.html"
}
}

function readInternalHistoryStack(){
try{
const raw = sessionStorage.getItem(INTERNAL_HISTORY_KEY)
const parsed = raw ? JSON.parse(raw) : []
return Array.isArray(parsed) ? parsed.filter(Boolean) : []
}catch(e){
return []
}
}

function writeInternalHistoryStack(stack){
try{
sessionStorage.setItem(
INTERNAL_HISTORY_KEY,
JSON.stringify((Array.isArray(stack) ? stack : []).filter(Boolean).slice(-30))
)
}catch(e){}
}

function rememberCurrentInternalPage(){
if(!isInternalAppPage()) return

const current = getNormalizedCurrentHref()
const stack = readInternalHistoryStack()

if(stack[stack.length - 1] !== current){
stack.push(current)
}

writeInternalHistoryStack(stack)
}

function getPreviousInternalPage(){
const current = getNormalizedCurrentHref()
const stack = readInternalHistoryStack()

while(stack.length && stack[stack.length - 1] === current){
stack.pop()
}

const previous = stack.length ? stack[stack.length - 1] : ""
writeInternalHistoryStack(previous ? stack : [])

return previous
}

function closeTopMostStudioOSOverlay(){
const selectors = [
".studioos-select-shell.is-open",
".event-select-shell.is-open",
"#studioosGalleryConfirmModal",
"#studioosGalleryInfoModal",
"#studioosGalleryToast",
"#studioosPaymentToast",
"#studioosBackToast",
"#textEditModal.show"
]

for(const selector of selectors){
const el = document.querySelector(selector)
if(!el) continue

if(el.classList && el.classList.contains("is-open")){
el.classList.remove("is-open")
return true
}

if(el.id === "textEditModal"){
el.classList.remove("show")
el.setAttribute("aria-hidden","true")
document.body.style.overflow = ""
return true
}

if(el.parentNode){
el.remove()
return true
}
}

return false
}

function showStudioOSBackToast(message){
const existingToast = document.getElementById("studioosBackToast")
if(existingToast){
existingToast.remove()
}

const toast = document.createElement("div")
toast.id = "studioosBackToast"
toast.style.position = "fixed"
toast.style.left = "50%"
toast.style.bottom = "calc(84px + env(safe-area-inset-bottom, 0px))"
toast.style.transform = "translateX(-50%)"
toast.style.width = "min(calc(100% - 32px), 340px)"
toast.style.zIndex = "2147482600"
toast.style.padding = "0.82rem 1rem"
toast.style.borderRadius = "1rem"
toast.style.background = "rgba(15,23,42,0.96)"
toast.style.border = "1px solid rgba(255,255,255,0.12)"
toast.style.boxShadow = "0 18px 55px rgba(0,0,0,0.38)"
toast.style.backdropFilter = "blur(16px)"
toast.style.webkitBackdropFilter = "blur(16px)"
toast.style.color = "#ffffff"
toast.style.fontSize = "0.88rem"
toast.style.fontWeight = "800"
toast.style.textAlign = "center"
toast.style.pointerEvents = "none"
toast.textContent = message

document.body.appendChild(toast)

setTimeout(()=>{
toast.style.transition = "opacity 180ms ease, transform 180ms ease"
toast.style.opacity = "0"
toast.style.transform = "translateX(-50%) translateY(8px)"
setTimeout(()=>{
toast.remove()
}, 220)
}, 1700)
}

function shouldInstallNativeBackHandler(){
return isStudioOSNativeApp() && isInternalAppPage()
}

let studioOSNativeBackInstalled = false
let studioOSLastDashboardBackAt = 0

function safeNavigateBackOrHome(){
if(closeTopMostStudioOSOverlay()){
return
}

try{
if(isDashboardPage()){
const now = Date.now()

if(now - studioOSLastDashboardBackAt < 1800){
const App = getCapacitorAppPlugin()
if(App && typeof App.exitApp === "function"){
App.exitApp()
return
}
}

studioOSLastDashboardBackAt = now
showStudioOSBackToast("Press back again to exit")
return
}

const previousInternalPage = getPreviousInternalPage()

if(previousInternalPage){
window.location.href = previousInternalPage
return
}

}catch(e){
console.warn("StudioOS back navigation fallback used:", e)
}

window.location.href = getInternalFallbackPage()
}

function installStudioOSNativeBackHandler(){
if(studioOSNativeBackInstalled || !shouldInstallNativeBackHandler()){
return false
}

const App = getCapacitorAppPlugin()

if(!App || typeof App.addListener !== "function"){
return false
}

studioOSNativeBackInstalled = true

try{
App.addListener("backButton", function(){
safeNavigateBackOrHome()
})
return true
}catch(e){
studioOSNativeBackInstalled = false
console.warn("StudioOS native back handler not installed:", e)
return false
}
}

function installStudioOSNativeBackHandlerWithRetry(){
if(!shouldInstallNativeBackHandler()){
return
}

let attempts = 0
const maxAttempts = 40

const tryInstall = function(){
attempts++

if(installStudioOSNativeBackHandler()){
return
}

if(attempts < maxAttempts){
setTimeout(tryInstall, 150)
}else if(isStudioOSNativeApp()){
console.warn("StudioOS native back handler unavailable. Ensure @capacitor/app is installed and synced.")
}
}

tryInstall()
}


function normalizeHref(value){
return String(value || "").split("?")[0].split("#")[0].toLowerCase()
}

function getActiveKey(){
const page = getPageName()

if(page === "dashboard.html"){
return "home"
}

if(page === "subscription.html"){
return "plans"
}

if(page === "events.html"){
return "events"
}

return ""
}

async function hasAuthenticatedStudioOSUser(){
try{
if(window.getCurrentUserWithoutBlockCheck){
const user = await window.getCurrentUserWithoutBlockCheck()
return !!user?.id
}

if(window.getCurrentUser){
const user = await window.getCurrentUser()
return !!user?.id
}

if(window.getSupabase){
const supabase = await window.getSupabase()
const { data, error } = await supabase.auth.getSession()
if(error){
return false
}
return !!data?.session?.access_token
}

return false
}catch(e){
return false
}
}

function injectBottomNavStyles(){
if(document.getElementById(STYLE_ID)){
return
}

const style = document.createElement("style")
style.id = STYLE_ID
style.textContent = `
:root{
  --studioos-bottom-nav-height: 66px;
}

body.studioos-has-bottom-nav{
  padding-bottom: calc(var(--studioos-bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 8px) !important;
}

#${NAV_ID}{
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(var(--studioos-bottom-nav-height) + env(safe-area-inset-bottom, 0px));
  z-index: 2147482000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 env(safe-area-inset-bottom, 0px);
  background: rgba(15, 23, 42, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

#${NAV_ID} .studioos-bottom-nav-inner{
  width: min(100%, 430px);
  height: var(--studioos-bottom-nav-height);
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 0;
}

#${NAV_ID} .studioos-bottom-nav-item{
  position: relative;
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.64);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 140ms ease, color 140ms ease, background 140ms ease;
}

#${NAV_ID} .studioos-bottom-nav-item:active{
  transform: scale(0.92);
  background: rgba(255,255,255,0.04);
}

#${NAV_ID} .studioos-bottom-nav-item svg{
  width: 29px;
  height: 29px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-linejoin: round;
  display: block;
}

#${NAV_ID} .studioos-bottom-nav-item.is-active{
  color: #ffffff;
}

#${NAV_ID} .studioos-bottom-nav-item.is-active svg{
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 0;
}

#${NAV_ID} .studioos-bottom-nav-item.is-active::after{
  content: "";
  position: absolute;
  bottom: 7px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #ffffff;
  opacity: 0.95;
}

@media (max-width: 360px){
  :root{
    --studioos-bottom-nav-height: 62px;
  }

  #${NAV_ID} .studioos-bottom-nav-item svg{
    width: 27px;
    height: 27px;
  }

  #${NAV_ID} .studioos-bottom-nav-item.is-active::after{
    bottom: 6px;
  }
}
`
document.head.appendChild(style)
}

async function renderBottomNav(){
if(!isInternalAppPage()){
return
}

rememberCurrentInternalPage()
installStudioOSNativeBackHandlerWithRetry()

if(document.getElementById(NAV_ID)){
document.body.classList.add("studioos-has-bottom-nav")
return
}

const isLoggedIn = await hasAuthenticatedStudioOSUser()
if(!isLoggedIn){
return
}

injectBottomNavStyles()

const activeKey = getActiveKey()
const nav = document.createElement("nav")
nav.id = NAV_ID
nav.setAttribute("aria-label", "StudioOS bottom navigation")

const inner = document.createElement("div")
inner.className = "studioos-bottom-nav-inner"

INTERNAL_NAV_ITEMS.forEach(item=>{
const link = document.createElement("a")
link.href = item.href
link.className = "studioos-bottom-nav-item"
link.setAttribute("aria-label", item.label)
link.setAttribute("title", item.label)
link.dataset.navKey = item.key

const isActive = activeKey === item.key || normalizeHref(item.href) === getPageName()
link.innerHTML = isActive ? item.iconFilled : item.iconOutline

if(isActive){
link.classList.add("is-active")
link.setAttribute("aria-current", "page")
}

link.addEventListener("click", function(event){
const targetHref = normalizeHref(item.href)
const currentPage = getPageName()

if(targetHref === currentPage){
event.preventDefault()
return
}

rememberCurrentInternalPage()
})

inner.appendChild(link)
})

nav.appendChild(inner)
document.body.appendChild(nav)
document.body.classList.add("studioos-has-bottom-nav")
}

function bootStudioOSAppShell(){
if(!isInternalAppPage()){
return
}

rememberCurrentInternalPage()
installStudioOSNativeBackHandlerWithRetry()
renderBottomNav().catch(()=>{})
}

window.StudioOSAppShell = {
isNativeApp: isStudioOSNativeApp,
goBack: safeNavigateBackOrHome,
rememberCurrentInternalPage: rememberCurrentInternalPage,
renderBottomNav: renderBottomNav
}

if(document.readyState === "loading"){
document.addEventListener("DOMContentLoaded", bootStudioOSAppShell)
}else{
bootStudioOSAppShell()
}

})()
