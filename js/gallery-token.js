// =============================
// TOKEN MODULE (FINAL CLEAN FIXED)
// =============================

window.showToken = async function(eventId){

// 🔥 MENU CLOSE FIX
const menu = document.getElementById("floatingMenu")
if(menu) menu.remove()

// 🔐 SUBSCRIPTION GATE: token access must stay locked for Free plan
if(typeof guardPublicGalleryFeature !== "function"){
console.error("Public gallery subscription guard missing")
alert("Unable to verify gallery access. Please try again.")
return
}

const allowed = await guardPublicGalleryFeature(eventId, "sharing")
if(!allowed) return

if(typeof window.ensurePublicShareToken !== "function"){
console.error("Public share token helper missing")
alert("Unable to generate token. Please try again.")
return
}

const token = await window.ensurePublicShareToken(eventId)

if(!token){
alert("Unable to generate token. Please try again.")
return
}

// =============================
// 🎨 CLEAN MODAL UI
// =============================

const modal = document.createElement("div")

modal.style.position = "fixed"
modal.style.top = 0
modal.style.left = 0
modal.style.width = "100%"
modal.style.height = "100%"
modal.style.background = "rgba(0,0,0,0.85)"
modal.style.display = "flex"
modal.style.alignItems = "center"
modal.style.justifyContent = "center"
modal.style.zIndex = 9999

modal.innerHTML = `
<div style="background:#111; padding:20px; border-radius:12px; text-align:center">
<div style="font-size:14px">Event Token</div>
<div style="font-size:22px; font-weight:bold; color:#4f46e5">${token}</div>

<button style="margin-top:15px; padding:6px 12px; background:#4f46e5; color:white; border-radius:6px">
Copy
</button>
</div>
`

// =============================
// ❌ CLOSE ON OUTSIDE CLICK
// =============================

modal.onclick = (e)=>{
if(e.target === modal) modal.remove()
}

// =============================
// 📋 COPY BUTTON
// =============================

modal.querySelector("button").onclick = ()=>{
navigator.clipboard.writeText(token)
alert("Token copied")
}

// =============================
// ADD TO BODY
// =============================

document.body.appendChild(modal)

}