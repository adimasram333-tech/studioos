// ================================
// ACCESS SYSTEM + PHONE OTP (FINAL CLEAN)
// ================================

async function initAccess() {

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

  const form = document.getElementById("accessForm");

  if (!form) {
    console.error("Form not found");
    return;
  }

  // =============================
  // DEVICE ID
  // =============================

  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }

  let otpAttempts = 0;
  const maxAttempts = 3;

  let currentPhone = null;
  let currentName = null;
  let existingVisitor = null;
  let userRole = "guest";

  // =============================
  // TOKEN INPUT
  // =============================

  if (!document.getElementById("tokenInput")) {

    const tokenDiv = document.createElement("div");
    tokenDiv.className = "mt-3";

    tokenDiv.innerHTML = `
      <input 
        type="text"
        id="tokenInput"
        placeholder="Access Code (optional for client)"
        class="w-full p-3 rounded-lg bg-gray-700 border border-gray-600"
      >
    `;

    form.insertBefore(tokenDiv, form.firstChild);
  }

  // =============================
  // TOKEN VERIFY FUNCTION (NEW)
  // =============================

  async function verifyToken(visitorId) {

    const token = document.getElementById("tokenInput").value.trim();

    if (!token) return false;

    const { data: tokenData } = await supabase
      .from("event_tokens")
      .select("*")
      .eq("event_id", eventId)
      .eq("token", token)
      .limit(1);

    if (tokenData && tokenData.length > 0) {

      const t = tokenData[0];

      if (!t.used) {

        await supabase
          .from("event_tokens")
          .update({
            used: true,
            used_by: visitorId,
            device_id: deviceId
          })
          .eq("id", t.id);

        return true;

      } else {

        if (t.device_id === deviceId) {
          return true;
        } else {
          alert("Token already used on another device");
          return null;
        }
      }

    } else {
      alert("Invalid access code");
      return null;
    }
  }

  // =============================
  // OTP UI
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
        placeholder="Enter last 4 digits of your phone number"
        class="w-full p-3 rounded-lg bg-gray-700 border border-gray-600"
      >

      <button 
        id="verifyOtpBtn"
        class="w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold"
      >
        Verify & Continue
      </button>
    `;

    form.appendChild(otpDiv);

    document.getElementById("verifyOtpBtn")
      .addEventListener("click", verifyOTP);
  }

  // =============================
  // VERIFY OTP (PHONE BASED)
  // =============================

  async function verifyOTP() {

    const entered = document.getElementById("otpInput").value.trim();

    if (!entered) {
      alert("Enter OTP");
      return;
    }

    if (otpAttempts >= maxAttempts) {
      alert("Too many attempts. Try again later.");
      return;
    }

    const expectedOTP = currentPhone.slice(-4);

    if (entered !== expectedOTP) {
      otpAttempts++;
      alert("Invalid OTP");
      return;
    }

    otpAttempts = 0;

    try {

      let visitorId;

      if (existingVisitor) {

        const { data, error } = await supabase
          .from("event_visitors")
          .update({
            verified: true,
            last_visit: new Date().toISOString()
          })
          .eq("id", existingVisitor.id)
          .select()
          .single();

        if (error) {
          console.error(error);
          alert("Update failed");
          return;
        }

        visitorId = data.id;

      } else {

        const { data, error } = await supabase
          .from("event_visitors")
          .insert([
            {
              event_id: eventId,
              name: currentName,
              phone: currentPhone,
              verified: true,
              last_visit: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (error) {
          console.error(error);
          alert("Insert failed");
          return;
        }

        visitorId = data.id;
      }

      // 🔥 TOKEN CHECK AFTER OTP
      const tokenResult = await verifyToken(visitorId);

      if (tokenResult === null) return;

      if (tokenResult === true) {
        userRole = "client";
      }

      // =============================
      // SESSION STORE
      // =============================

      sessionStorage.setItem("gallery_access", "true");
      sessionStorage.setItem("event_id", eventId);
      sessionStorage.setItem("visitor_id", visitorId);
      sessionStorage.setItem("role", userRole);

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

    const { data } = await supabase
      .from("event_visitors")
      .select("*")
      .eq("event_id", eventId)
      .eq("phone", phone)
      .limit(1);

    if (data && data.length > 0) {

      existingVisitor = data[0];

      // 🔥 FIX: TOKEN CHECK BEFORE DIRECT ACCESS
      const tokenResult = await verifyToken(existingVisitor.id);

      if (tokenResult === null) return;

      if (tokenResult === true) {

        sessionStorage.setItem("gallery_access", "true");
        sessionStorage.setItem("event_id", eventId);
        sessionStorage.setItem("visitor_id", existingVisitor.id);
        sessionStorage.setItem("role", "client");

        window.location.href = `gallery.html?event_id=${eventId}`;
        return;
      }

      if (existingVisitor.verified) {

        sessionStorage.setItem("gallery_access", "true");
        sessionStorage.setItem("event_id", eventId);
        sessionStorage.setItem("visitor_id", existingVisitor.id);
        sessionStorage.setItem("role", "guest");

        await supabase
          .from("event_visitors")
          .update({ last_visit: new Date().toISOString() })
          .eq("id", existingVisitor.id);

        window.location.href = `gallery.html?event_id=${eventId}`;
        return;
      }
    }

    alert("Verifying...");

    await new Promise(res => setTimeout(res, 800));

    showOTPInput();

  });

}

// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded", () => {
  initAccess();
});