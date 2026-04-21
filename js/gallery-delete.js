// =============================
// DELETE MODULE (FINAL PRODUCTION SAFE - S3)
// =============================

window.deleteGallery = async function(eventId){

  const confirmDelete = confirm("Delete gallery permanently?\n\nThis will remove all photos, tokens and the event.")
  if(!confirmDelete) return

  try{

    const supabase = await window.getSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if(!session){
      alert("Please login again")
      return
    }

    // 🔥 CALL FINAL BACKEND (NO CLOUDINARY, NO DOUBLE DELETE)
    const res = await fetch(
      "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/delete-gallery",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SUPABASE_ANON_KEY || "",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ event_id: String(eventId) })
      }
    )

    let result = null
    try{
      result = await res.json()
    }catch(_err){
      result = null
    }

    if(!res.ok || !result?.success){
      console.error("Delete failed:", result)
      alert(result?.error || "Delete failed")
      return
    }

    alert("Gallery deleted successfully")

    const menu = document.getElementById("floatingMenu")
    if(menu) menu.remove()

    location.reload()

  }catch(err){
    console.error(err)
    alert("Delete failed")
  }
}
