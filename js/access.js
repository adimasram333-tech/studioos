// ================================
// ACCESS SYSTEM + DEMO OTP (FINAL)
// ================================

async function initAccess() {

  // =============================
  // SUPABASE INIT
  // =============================

  let supabase;

  if (window.getSupabase) {
    supabase = await window.getSupabase();
  } else if (window.supabase) {
    supabase = window.supabase;
  } else {
    console.error("Supabase not found");
    alert("System error: Supabase not initialized");
    return;
  }

  // =============================
  // GET EVENT ID
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

  localStorage.setItem("last_event_id", eventId);

  console.log("FINAL EVENT ID:", eventId);

  const form = document.getElementById("accessForm");

  if (!form) {
    console.error("Form not found");
    return;
  }

  // =============================
  // OTP STATE
  // =============================

  let generatedOTP = null;
  let currentPhone = null;
  let currentName = null;

  // =============================
  // CREATE OTP INPUT UI (DYNAMIC)
  // =============================

  function showOTPInput() {

    if (document.getElementById("otpBox")) return;

    const otpDiv = document.createElement("div");
    otpDiv.id = "otpBox";
    otpDiv.className = "mt-4 space-y-3";

    otpDiv.innerHTML = `
      <input 
        type="text"
        id="otpInput"
        placeholder="Enter OTP"
        class="w-full p-3 rounded-lg bg-gray-700 border border-gray-600"
      >

      <button 
        id="verifyOtpBtn"
        class="w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold"
      >
        Verify OTP
      </button>

      <p class="text-xs text-gray-400 text-center">
        Demo OTP: <span id="otpPreview">${generatedOTP}</span>
      </p>
    `;

    form.appendChild(otpDiv);

    document.getElementById("verifyOtpBtn")
      .addEventListener("click", verifyOTP);
  }

  // =============================
  // VERIFY OTP
  // =============================

  async function verifyOTP() {

    const entered = document.getElementById("otpInput").value.trim();

    if (!entered) {
      alert("Enter OTP");
      return;
    }

    if (entered !== String(generatedOTP)) {
      alert("Invalid OTP");
      return;
    }

    console.log("OTP VERIFIED");

    try {

      // SAVE VERIFIED VISITOR
      const { data, error } = await supabase
        .from("event_visitors")
        .insert([
          {
            event_id: eventId,
            name: currentName,
            phone: currentPhone
          }
        ])
        .select();

      if (error) {
        console.error(error);
        alert("Failed to save");
        return;
      }

      // ACCESS FLAG
      sessionStorage.setItem("gallery_access", "true");
      sessionStorage.setItem("event_id", eventId);

      // REDIRECT
      window.location.href = `gallery.html?event_id=${eventId}`;

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }

  }

  // =============================
  // SUBMIT HANDLER
  // =============================

  form.addEventListener("submit", async function (e) {

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!name || !phone) {
      alert("Please fill all details");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Enter valid 10 digit number");
      return;
    }

    currentName = name;
    currentPhone = phone;

    // =============================
    // CHECK EXISTING VERIFIED USER
    // =============================

    const { data: existing } = await supabase
      .from("event_visitors")
      .select("*")
      .eq("event_id", eventId)
      .eq("phone", phone)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("Already verified → skip OTP");

      sessionStorage.setItem("gallery_access", "true");
      sessionStorage.setItem("event_id", eventId);

      window.location.href = `gallery.html?event_id=${eventId}`;
      return;
    }

    // =============================
    // GENERATE DEMO OTP
    // =============================

    generatedOTP = Math.floor(1000 + Math.random() * 9000);

    console.log("DEMO OTP:", generatedOTP);

    alert("Demo OTP: " + generatedOTP);

    showOTPInput();

  });

}

// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded", () => {
  initAccess();
});