// =============================
// LOAD GALLERY
// =============================

async function loadGallery(){

const supabase = await window.getSupabase()

const user = await window.getCurrentUser()

if(!user){
console.error("User not found")
return
}


// =============================
// 🔥 GET EVENT ID (FIXED)
// =============================

// 1. URL param
const params = new URLSearchParams(window.location.search)
let eventId = params.get("event")

// 2. fallback to localStorage
if(!eventId){
eventId = localStorage.getItem("current_event")
}

if(!eventId){
console.log("No event selected")
return
}


// =============================
// FETCH DATA
// =============================

const { data, error } =
await supabase
.from("gallery_photos")
.select("*")
.eq("event_id", eventId)
.eq("user_id", user.id)
.order("created_at",{ ascending:false })

if(error){
console.error("Gallery fetch error:",error)
return
}


// =============================
// UI RENDER
// =============================

const grid = document.getElementById("galleryGrid")
const empty = document.getElementById("emptyState")

grid.innerHTML = ""

if(!data || data.length === 0){
empty.classList.remove("hidden")
return
}

empty.classList.add("hidden")

data.forEach(img=>{

const div = document.createElement("div")

div.className =
"glass rounded-xl overflow-hidden cursor-pointer"

div.innerHTML = `
<img src="${img.image_url}"
class="w-full h-40 object-cover hover:scale-105 transition"/>
`

grid.appendChild(div)

})

}


// =============================
// AUTO INIT
// =============================

document.addEventListener("DOMContentLoaded",()=>{

loadGallery()

})