// =============================
// DELETE MODULE (FINAL PRODUCTION SAFE - S3)
// =============================

window.deleteGallery = async function(eventId){

  const confirmDelete = confirm(
    "Delete gallery permanently?\n\nThis will remove all photos, tokens and the event."
  );
  if(!confirmDelete) return;

  try{

    const supabase = await window.getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if(!session){
      alert("Session expired. Please login again.");
      return;
    }

    // 🔥 USE ENV BASE URL (NO HARDCODE)
    const functionUrl = `${window.SUPABASE_URL}/functions/v1/delete-gallery`;

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_ANON_KEY || "",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ event_id: String(eventId) })
    });

    let result = null;

    try{
      result = await res.json();
    }catch(_err){
      result = null;
    }

    if(!res.ok){
      console.error("Delete HTTP error:", res.status, result);
      alert(result?.error || "Delete failed. Please try again.");
      return;
    }

    if(!result || result.success !== true){
      console.error("Delete failed:", result);
      alert(result?.error || "Delete failed");
      return;
    }

    // 🔥 SUCCESS
    alert("Gallery deleted successfully");

    // Clean UI
    const menu = document.getElementById("floatingMenu");
    if(menu) menu.remove();

    // Reload page
    location.reload();

  }catch(err){
    console.error("Delete exception:", err);
    alert("Delete failed. Please try again.");
  }
};