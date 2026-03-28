async function initAccess() {

  const supabase = await window.getSupabase();

  // =============================
  // GET EVENT ID (FIXED)
  // =============================

  const params = new URLSearchParams(window.location.search);
  let eventId = params.get("event_id");

  // 🔥 fallback (अगर URL में missing हो)
  if (!eventId) {
    eventId = localStorage.getItem("last_event_id");
  }

  if (!eventId) {
    alert("Invalid access link");
    return;
  }

  // store for safety
  localStorage.setItem("last_event_id", eventId);

  // =============================
  // FORM SUBMIT
  // =============================

  const form = document.getElementById("accessForm");

  if (!form) {
    console.error("Form not found");
    return;
  }

  form.addEventListener("submit", async function (e) {

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // =============================
    // VALIDATION (ADDED)
    // =============================

    if (!name || !phone) {
      alert("Please fill all details");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Enter valid 10 digit number");
      return;
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
      ]);

    if (error) {
      console.error("Insert error:", error);
      alert("Failed to save data");
      return;
    }

    // =============================
    // 🔒 ACCESS FLAG
    // =============================

    sessionStorage.setItem("gallery_access", "true");
    sessionStorage.setItem("event_id", eventId);

    // =============================
    // REDIRECT (FIXED SAFE)
    // =============================

    window.location.href = `gallery.html?event_id=${eventId}`;

  });

}

// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded", initAccess);