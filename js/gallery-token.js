// =============================
// TOKEN MODULE (FINAL CLEAN)
// =============================

window.showToken = async function(eventId){

const supabase = await window.getSupabase()

let { data } = await supabase
.from("event_tokens")
.select("*")
.eq("event_id", eventId)
.order("created_at",{ ascending:true })
.limit(1)

let token = null

if(data && data.length > 0){
token = data[0].token
}else{

const newToken = Math.random().toString(36).substring(2,8).toUpperCase()

const { data: inserted } = await supabase
.from("event_tokens")
.insert([{ event_id:eventId, token:newToken }])
.select()
.limit(1)

token = inserted?.[0]?.token || newToken
}

// 🔥 CLEAN MODAL

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

modal.onclick = (e)=>{
if(e.target === modal) modal.remove()
}

modal.querySelector("button").onclick = ()=>{
navigator.clipboard.writeText(token)
}

document.body.appendChild(modal)

}