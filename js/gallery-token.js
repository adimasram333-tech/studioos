// =============================
// TOKEN MODULE (FINAL CLEAN FIXED)
// =============================

window.showToken = async function(eventId){

// 🔥 MENU CLOSE FIX
const menu = document.getElementById("floatingMenu")
if(menu) menu.remove()

const supabase = await window.getSupabase()

// =============================
// ✅ STEP 1: GET EXISTING TOKEN (NO DUPLICATE)
// =============================

let { data, error } = await supabase
.from("event_tokens")
.select("*")
.eq("event_id", eventId)
.limit(1)
.single()

let token = null

// =============================
// ✅ STEP 2: IF EXISTS → USE SAME TOKEN
// =============================

if(data && data.token){
token = data.token
}else{

// =============================
// 🔥 STEP 3: CREATE NEW TOKEN (ONLY ONCE)
// =============================

const newToken = Math.random().toString(36).substring(2,8).toUpperCase()

const { data: inserted, error: insertError } = await supabase
.from("event_tokens")
.insert([{ event_id:eventId, token:newToken }])
.select()
.single()

token = inserted?.token || newToken
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