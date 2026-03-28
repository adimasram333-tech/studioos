async function initAccess(){

const supabase = await window.getSupabase()

// =============================
// GET EVENT ID
// =============================

const params = new URLSearchParams(window.location.search)
const eventId = params.get("event_id")

if(!eventId){
alert("Invalid access link")
return
}

// =============================
// FORM SUBMIT
// =============================

const form = document.getElementById("accessForm")

if(!form){
console.error("Form not found")
return
}

form.addEventListener("submit", async function(e){

e.preventDefault()

const name = document.getElementById("name").value.trim()
const phone = document.getElementById("phone").value.trim()

if(!name || !phone){
alert("Please fill all details")
return
}

// =============================
// SAVE VISITOR
// =============================

const { error } = await supabase
.from("event_visitors")
.insert([
{
event_id: eventId,
name: name,
phone: phone
}
])

if(error){
console.error("Insert error:", error)
alert("Failed to save data")
return
}

// =============================
// 🔒 SET ACCESS FLAG
// =============================

sessionStorage.setItem("gallery_access", "true")

// =============================
// REDIRECT
// =============================

window.location.href = `gallery.html?event_id=${eventId}`

})

}

// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded", initAccess)
