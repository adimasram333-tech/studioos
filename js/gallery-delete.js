// =============================
// DELETE MODULE (FINAL FIXED)
// =============================

window.deleteGallery = async function(eventId){

const confirmDelete = confirm("Delete gallery permanently?")
if(!confirmDelete) return

try{

// 🔥 CALL EDGE FUNCTION
const res = await fetch("https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/smart-processor", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFhYWd2bHJtZHZlcXhpY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk4NTQsImV4cCI6MjA4ODA3NTg1NH0.LgK0WDOa1wp4vhUS3BjvQUpvU_pENGTZegbCtd_HWNE",
"apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubmFhYWd2bHJtZHZlcXhpY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk4NTQsImV4cCI6MjA4ODA3NTg1NH0.LgK0WDOa1wp4vhUS3BjvQUpvU_pENGTZegbCtd_HWNE"
},
body: JSON.stringify({ event_id: eventId })
})

// 🔥 IMPORTANT: response check
const result = await res.json()

console.log("DELETE RESPONSE:", result)

// ❌ अगर backend fail हुआ
if(!res.ok || !result.success){
alert("Delete failed (backend)")
return
}

// 🔥 SUPABASE CLEANUP
const supabase = await window.getSupabase()

await supabase.from("gallery_photos").delete().eq("event_id", eventId)
await supabase.from("event_tokens").delete().eq("event_id", eventId)

// ✅ UI FIX
alert("Gallery deleted successfully")

// menu close
const menu = document.getElementById("floatingMenu")
if(menu) menu.remove()

location.reload()

}catch(err){
console.error(err)
alert("Delete failed")
}

}