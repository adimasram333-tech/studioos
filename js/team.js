// ===== GLOBAL =====

let quotationId = null;
let members = [];
let db = null;


// ===== GET QUOTATION ID =====

function getQuotationId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("quotation") || params.get("id");
}


// ===== FORMAT DATE =====

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


// ===== GET EVENT NAME =====

function getEventNameFromQuotation(data) {
  return (
    data?.event_category ||
    data?.event_type ||
    data?.package ||
    data?.event_name ||
    "-"
  );
}


// ===== WAIT FOR SUPABASE (FIX) =====

async function waitForSupabaseReady() {
  let retries = 0;

  while (retries < 20) {
    if (window.getSupabase) {
      return await window.getSupabase();
    }

    await new Promise(r => setTimeout(r, 200));
    retries++;
  }

  throw new Error("Supabase not ready");
}


// ===== INIT =====

window.addEventListener("DOMContentLoaded", async () => {
  try {
    quotationId = getQuotationId();

    if (!quotationId) {
      alert("Invalid access");
      return;
    }

    // ✅ FIXED: wait properly
    db = await waitForSupabaseReady();

    if (!db) {
      throw new Error("Supabase not initialized");
    }

    await loadClientData();
  } catch (err) {
    console.error("APP INIT ERROR:", err);
    alert("App init failed");
  }
});


// ===== LOAD CLIENT DATA =====

async function loadClientData() {
  try {
    const { data, error } = await db
      .from("quotations")
      .select("*")
      .eq("id", quotationId)
      .single();

    if (error) throw error;

    document.getElementById("clientName").innerText =
      data?.client_name || "-";

    document.getElementById("eventName").innerText =
      getEventNameFromQuotation(data);

    document.getElementById("eventDate").innerText =
      formatDate(data?.event_start_date || data?.event_date);

    document.getElementById("venue").innerText =
      data?.venue || "-";

  } catch (err) {
    console.error("LOAD CLIENT DATA ERROR:", err);
    alert("Failed to load client data");
  }
}


// ===== ADD MEMBER UI =====

function addMember() {
  const container = document.getElementById("membersContainer");
  const index = members.length;

  const div = document.createElement("div");
  div.className = "glass p-4 rounded-xl space-y-2";

  div.innerHTML = `
    <div>
      <label class="text-sm text-gray-400">Member Name</label>
      <input id="member_name_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-white text-sm outline-none"
      placeholder="Enter member name">
    </div>

    <div>
      <label class="text-sm text-gray-400">Phone</label>
      <input id="phone_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-white text-sm outline-none"
      placeholder="Enter phone number">
    </div>

    <div>
      <label class="text-sm text-gray-400">Alt Phone</label>
      <input id="alt_phone_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-white text-sm outline-none"
      placeholder="Optional alternate number">
    </div>

    <div>
      <label class="text-sm text-gray-400">Reporting Time</label>
      <input id="reporting_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-white text-sm outline-none"
      placeholder="e.g. 8:00 AM">
    </div>

    <div>
      <label class="text-sm text-gray-400">Note</label>
      <input id="note_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-white text-sm outline-none"
      placeholder="Optional note">
    </div>
  `;

  container.appendChild(div);
  members.push(index);
}


// ===== SAVE TEAM =====

async function saveTeam() {
  const role = document.getElementById("role").value;
  const day = document.getElementById("day").value;

  if (!role) {
    alert("Select role");
    return;
  }

  if (members.length === 0) {
    alert("Add at least one member");
    return;
  }

  try {
    const { data: client, error: fetchError } = await db
      .from("quotations")
      .select("*")
      .eq("id", quotationId)
      .single();

    if (fetchError) throw fetchError;

    const insertData = [];

    members.forEach((i) => {
      const member_name =
        document.getElementById(`member_name_${i}`)?.value.trim() || "";

      const phone =
        document.getElementById(`phone_${i}`)?.value.trim() || "";

      if (!member_name || !phone) return;

      insertData.push({
        quotation_id: quotationId,
        client_name: client?.client_name || "",
        event_name: getEventNameFromQuotation(client),
        event_date: client?.event_start_date || client?.event_date || "",
        venue: client?.venue || "",
        role_name: role,
        day: day,
        member_name: member_name,
        phone: phone,
        alt_phone:
          document.getElementById(`alt_phone_${i}`)?.value.trim() || "",
        reporting_time:
          document.getElementById(`reporting_${i}`)?.value.trim() || "",
        note:
          document.getElementById(`note_${i}`)?.value.trim() || ""
      });
    });

    if (insertData.length === 0) {
      alert("Fill member details");
      return;
    }

    const { error } = await db
      .from("team_assignments")
      .insert(insertData);

    if (error) throw error;

    alert("Team saved successfully");
    window.location.href = `client.html?quotation=${quotationId}`;

  } catch (err) {
    console.error("SAVE TEAM ERROR:", err);
    alert("Error saving team");
  }
}