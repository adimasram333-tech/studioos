// =============================
// GALLERY DELETE FRONTEND MODULE
// Browser file: js/gallery-delete.js
// IMPORTANT: No import/export here. This file is loaded as a normal browser script.
// =============================

(function(){
  "use strict";

  function getConfigValue(name, fallback = ""){
    return String(window[name] || fallback || "").trim();
  }

  function getSupabaseUrl(){
    return getConfigValue("SUPABASE_URL", "https://gnnaaagvlrmdveqxicob.supabase.co");
  }

  function getSupabaseAnonKey(){
    return getConfigValue("SUPABASE_ANON_KEY", "");
  }

  async function getSupabaseClient(){
    if(typeof window.getSupabase === "function"){
      return await window.getSupabase();
    }

    if(window.supabaseClient){
      return window.supabaseClient;
    }

    if(window.supabase?.auth && typeof window.supabase.auth.getSession === "function"){
      return window.supabase;
    }

    return null;
  }

  async function getSession(){
    const supabase = await getSupabaseClient();

    if(!supabase){
      throw new Error("App connection failed. Please refresh and try again.");
    }

    const { data, error } = await supabase.auth.getSession();

    if(error){
      console.error("Delete session error:", error);
      throw new Error("Session check failed. Please login again.");
    }

    const session = data?.session || null;

    if(!session?.access_token){
      throw new Error("Session expired. Please login again.");
    }

    return session;
  }

  async function readJsonSafely(response){
    try{
      return await response.json();
    }catch(_err){
      return null;
    }
  }

  window.deleteGallery = async function(eventId){
    const safeEventId = String(eventId || "").trim();

    if(!safeEventId || safeEventId === "null" || safeEventId === "undefined"){
      alert("Event not found. Please refresh and try again.");
      return;
    }

    const confirmDelete = confirm(
      "Delete gallery permanently?\n\nThis will remove all photos, tokens and the event."
    );

    if(!confirmDelete) return;

    try{
      const session = await getSession();
      const supabaseUrl = getSupabaseUrl();
      const anonKey = getSupabaseAnonKey();

      if(!supabaseUrl){
        throw new Error("Supabase URL missing. Please refresh and try again.");
      }

      if(!anonKey){
        console.warn("SUPABASE_ANON_KEY is missing on window. Function call may fail if anon key is required.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/delete-gallery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          event_id: safeEventId
        })
      });

      const result = await readJsonSafely(response);

      if(!response.ok){
        console.error("Delete gallery HTTP error:", response.status, result);
        alert(result?.error || "Delete failed. Please try again.");
        return;
      }

      if(!result || result.success !== true){
        console.error("Delete gallery failed:", result);
        alert(result?.error || "Delete failed. Please try again.");
        return;
      }

      alert("Gallery deleted successfully");

      const menu = document.getElementById("floatingMenu");
      if(menu) menu.remove();

      window.location.reload();

    }catch(error){
      console.error("Delete gallery exception:", error);
      alert(error instanceof Error ? error.message : "Delete failed. Please try again.");
    }
  };
})();
