// ================================
// ACCESS SYSTEM (FULL FIXED VERSION)
// ================================

async function initAccess() {

  // =============================
  // SUPABASE INIT (FIXED - NO DEPENDENCY ISSUE)
  // =============================

  let supabase;

  if (window.getSupabase) {
    supabase = await window.getSupabase();
  } else if (window.supabase) {
    // fallback (important)
    supabase = window.supabase;
  } else {
    console.error("Supabase not found");
    alert("System error: Supabase not initialized");
    return;
  }

  // =============================
  // GET EVENT ID (SAFE + FIXED)
  // =============================

  const params = new URLSearchParams(window.location.search);
  let eventId = params.get("event_id");

  if (!eventId) {
    eventId = localStorage.getItem("last_event_id");
  }

  if (!eventId) {
    alert("Invalid access link");
    return;
  }

  // store for safety
  localStorage.setItem("last_event_id", eventId);

  console.log("FINAL EVENT ID:", eventId);

  // =============================
  // FORM HANDLE (SAFE INIT)
  // =============================

  const form = document.getElementById("accessForm");

  if (!form) {
    console.error("Form not found");
    return;
  }

  // prevent duplicate listeners
  form.removeEventListener("submit", handleSubmit);
  form.addEventListener("submit", handleSubmit);

  // =============================
  // SUBMIT FUNCTION
  // =============================

  async function handleSubmit(e) {

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // =============================
    // VALIDATION
    // =============================

    if (!name || !phone) {
      alert("Please fill all details");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Enter valid 10 digit number");
      return;
    }

    try {

      // =============================
      // SAVE VISITOR (STABLE)
      // =============================

      const { data, error } = await supabase
        .from("event_visitors")
        .insert([
          {
            event_id: eventId,
            name: name,
            phone: phone
          }
        ])
        .select();

      if (error) {
        console.error("Insert error:", error);
        alert("Failed to save data");
        return;
      }

      console.log("Visitor saved:", data);

      // =============================
      // ACCESS CONTROL FLAG
      // =============================

      sessionStorage.setItem("gallery_access", "true");
      sessionStorage.setItem("event_id", eventId);

      // =============================
      // REDIRECT (DELAY FIX)
      // =============================

      setTimeout(() => {
        window.location.href = `gallery.html?event_id=${eventId}`;
      }, 300);

    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Something went wrong");
    }

  }

}

// =============================
// INIT (SAFE)
// =============================

document.addEventListener("DOMContentLoaded", () => {
  initAccess();
});