// =============================
// GLOBAL
// =============================

let quotationId = null;


// =============================
// INIT
// =============================

window.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);
  quotationId = params.get("quotation");

  if (!quotationId) {
    alert("Invalid access");
    return;
  }

  await loadStudio();
  await loadTeamData();

});


// =============================
// LOAD STUDIO
// =============================

async function loadStudio() {

  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return;

  const { data } = await supabase
    .from("photographer_settings")
    .select("*")
    .eq("user_id", userData.user.id)
    .single();

  if (!data) return;

  document.getElementById("studioName").innerText =
    data.studio_name || "Studio";

  document.getElementById("studioPhone").innerText =
    data.phone || "-";

}


// =============================
// LOAD TEAM DATA
// =============================

async function loadTeamData() {

  const { data, error } = await supabase
    .from("team_assignments")
    .select("*")
    .eq("quotation_id", quotationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("teamList").innerHTML =
      "<p class='text-gray-500 text-sm'>No team assigned</p>";
    return;
  }

  // SET HEADER INFO (from first row)
  const first = data[0];

  document.getElementById("clientName").innerText = first.client_name || "-";
  document.getElementById("eventName").innerText = first.event_name || "-";
  document.getElementById("eventDate").innerText = first.event_date || "-";
  document.getElementById("venue").innerText = first.venue || "-";

  // GROUP BY ROLE
  const grouped = {};

  data.forEach(item => {
    const key = item.role_name;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(item);
  });

  renderTeam(grouped);

}


// =============================
// RENDER TEAM
// =============================

function renderTeam(grouped) {

  const container = document.getElementById("teamList");
  container.innerHTML = "";

  Object.keys(grouped).forEach(role => {

    const members = grouped[role];

    const roleBlock = document.createElement("div");

    roleBlock.innerHTML = `
      <div class="border-b pb-2 mb-2">
        <h3 class="font-semibold text-sm">${role}</h3>
      </div>

      <div class="space-y-2 text-sm">
        ${members.map(m => `
          <div class="flex justify-between">
            <div>
              <div>${m.day || "-"}</div>
              <div class="text-gray-600">${m.member_name}</div>
            </div>

            <div class="text-right">
              <div>${m.phone}</div>
              ${m.alt_phone ? `<div class="text-gray-500">${m.alt_phone}</div>` : ""}
            </div>
          </div>

          ${m.reporting_time ? `<div class="text-xs text-gray-500">Time: ${m.reporting_time}</div>` : ""}
          ${m.note ? `<div class="text-xs text-gray-500">Note: ${m.note}</div>` : ""}
        `).join("")}
      </div>
    `;

    container.appendChild(roleBlock);

  });

}


// =============================
// DOWNLOAD PDF
// =============================

async function downloadPDF() {

  const element = document.body;

  const opt = {
    margin: 0,
    filename: "team-sheet.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  await html2pdf().set(opt).from(element).save();

}


// =============================
// SHARE TEAM
// =============================

function shareTeam() {

  const url = window.location.href;

  if (navigator.share) {
    navigator.share({
      title: "Team Assignment",
      text: "Event Team Details",
      url: url
    });
  } else {
    alert("Sharing not supported. Copy link manually.");
  }

}