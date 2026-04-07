// ===== GLOBAL =====

let quotationId = null;
let members = [];

// ===== INIT =====

window.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);
  quotationId = params.get("quotation");

  if (!quotationId) {
    alert("Invalid access");
    return;
  }

  await loadClientData();

});


// ===== LOAD CLIENT DATA =====

async function loadClientData() {

  try {

    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", quotationId)
      .single();

    if (error) throw error;

    document.getElementById("clientName").innerText = data.client_name || "-";
    document.getElementById("eventName").innerText = data.event_type || "-";
    document.getElementById("eventDate").innerText = data.event_date || "-";
    document.getElementById("venue").innerText = data.venue || "-";

  } catch (err) {
    console.error(err);
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
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-sm outline-none">
    </div>

    <div>
      <label class="text-sm text-gray-400">Phone</label>
      <input id="phone_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-sm outline-none">
    </div>

    <div>
      <label class="text-sm text-gray-400">Alt Phone</label>
      <input id="alt_phone_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-sm outline-none">
    </div>

    <div>
      <label class="text-sm text-gray-400">Reporting Time</label>
      <input id="reporting_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-sm outline-none">
    </div>

    <div>
      <label class="text-sm text-gray-400">Note</label>
      <input id="note_${index}"
      class="w-full mt-1 p-2 rounded-lg bg-white/10 text-sm outline-none">
    </div>
  `;

  container.appendChild(div);

  members.push(index);

}


// ===== SAVE TEAM =====

async function saveTeam() {

  const role = document.getElementById("role").value.trim();
  const day = document.getElementById("day").value;

  if (!role) {
    alert("Enter role");
    return;
  }

  if (members.length === 0) {
    alert("Add at least one member");
    return;
  }

  try {

    // fetch client again (safe way)
    const { data: client } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", quotationId)
      .single();

    let insertData = [];

    members.forEach(i => {

      const member_name = document.getElementById(`member_name_${i}`).value;
      const phone = document.getElementById(`phone_${i}`).value;

      if (!member_name || !phone) return;

      insertData.push({
        quotation_id: quotationId,
        client_name: client.client_name,
        event_name: client.event_type,
        event_date: client.event_date,
        venue: client.venue,
        role_name: role,
        day: day,
        member_name: member_name,
        phone: phone,
        alt_phone: document.getElementById(`alt_phone_${i}`).value,
        reporting_time: document.getElementById(`reporting_${i}`).value,
        note: document.getElementById(`note_${i}`).value
      });

    });

    if (insertData.length === 0) {
      alert("Fill member details");
      return;
    }

    const { error } = await supabase
      .from("team_assignments")
      .insert(insertData);

    if (error) throw error;

    alert("Team saved successfully");

    window.location.href = `client.html?quotation=${quotationId}`;

  } catch (err) {
    console.error(err);
    alert("Error saving team");
  }

}