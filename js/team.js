// ===== GLOBAL =====

let quotationId = null;
let db = null;
let quotationData = null;
let teamData = {};
let isTeamSaved = false;


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


// ===== GET EVENT DATE RANGE =====

function getEventDateText(data) {
  const startRaw = data?.event_start_date || data?.event_date || "";
  const endRaw = data?.event_end_date || data?.end_date || "";

  const start = formatDate(startRaw);
  const end = formatDate(endRaw);

  if (startRaw && endRaw && startRaw !== endRaw) {
    return `${start} → ${end}`;
  }

  return start;
}


// ===== WAIT FOR SUPABASE =====

async function waitForSupabaseReady() {
  let retries = 0;

  while (retries < 20) {
    if (window.getSupabase) {
      return await window.getSupabase();
    }

    await new Promise(resolve => setTimeout(resolve, 200));
    retries++;
  }

  throw new Error("Supabase not ready");
}


// ===== GET GROUP KEY =====

function getGroupKey(role, day) {
  return `${role}__${day}`;
}


// ===== CLEAR MEMBER FORM =====

function clearMemberForm() {
  document.getElementById("memberName").value = "";
  document.getElementById("memberPhone").value = "";
  document.getElementById("memberAltPhone").value = "";
  document.getElementById("memberReportingTime").value = "";
  document.getElementById("memberNote").value = "";
}


// ===== UPDATE TEAM COUNT =====

function updateTeamCount() {
  const allMembers = Object.values(teamData).reduce((sum, arr) => sum + arr.length, 0);
  const countEl = document.getElementById("teamCount");

  if (!countEl) return;

  countEl.innerText = `${allMembers} member${allMembers === 1 ? "" : "s"}`;
}


// ===== TOGGLE FORM MODE =====

function setFormDisabled(disabled) {
  document.getElementById("role").disabled = disabled;
  document.getElementById("day").disabled = disabled;
  document.getElementById("memberName").disabled = disabled;
  document.getElementById("memberPhone").disabled = disabled;
  document.getElementById("memberAltPhone").disabled = disabled;
  document.getElementById("memberReportingTime").disabled = disabled;
  document.getElementById("memberNote").disabled = disabled;
  document.getElementById("addMemberBtn").disabled = disabled;
  document.getElementById("addMemberBtn").classList.toggle("opacity-50", disabled);
}

function setEditVisibility(show) {
  const editBtn = document.getElementById("editTeamBtn");
  if (!editBtn) return;

  if (show) {
    editBtn.classList.remove("hidden");
  } else {
    editBtn.classList.add("hidden");
  }
}


// ===== RENDER SUCCESS STATE =====

function renderSavedState() {
  const preview = document.getElementById("teamPreview");
  if (!preview) return;

  preview.innerHTML = `
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-sm text-green-400">
        <span>✔</span>
        <span>Team assigned successfully</span>
      </div>
    </div>
    <p class="text-xs text-gray-400">You can edit assigned members anytime.</p>
  `;

  setEditVisibility(true);
  setFormDisabled(true);
  updateTeamCount();
}


// ===== RENDER TEAM PREVIEW =====

function renderTeamPreview() {
  const preview = document.getElementById("teamPreview");
  if (!preview) return;

  const keys = Object.keys(teamData);

  if (keys.length === 0) {
    preview.innerHTML = `<p class="text-gray-400 text-sm">No members added yet</p>`;
    setEditVisibility(false);
    setFormDisabled(false);
    updateTeamCount();
    return;
  }

  preview.innerHTML = "";

  keys.forEach((key) => {
    const members = teamData[key];
    if (!members || members.length === 0) return;

    const first = members[0];
    const block = document.createElement("div");
    block.className = "border border-white/10 rounded-xl p-3 space-y-2";

    const header = document.createElement("div");
    header.className = "flex justify-between items-start gap-3";

    const title = document.createElement("div");
    title.innerHTML = `
      <div class="font-semibold text-white text-sm">${first.role_name}</div>
      <div class="text-xs text-gray-400">${first.day}</div>
    `;

    const removeBtn = document.createElement("button");
    removeBtn.className = "text-xs text-red-400 hover:text-red-300";
    removeBtn.type = "button";
    removeBtn.innerText = "Remove Group";
    removeBtn.onclick = function() {
      delete teamData[key];
      renderTeamPreview();
    };

    header.appendChild(title);
    header.appendChild(removeBtn);

    const list = document.createElement("div");
    list.className = "space-y-2";

    members.forEach((member, index) => {
      const row = document.createElement("div");
      row.className = "rounded-lg bg-white/5 p-2";

      row.innerHTML = `
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-sm text-white">${member.member_name}</div>
            <div class="text-xs text-gray-400">${member.phone}</div>
            ${member.alt_phone ? `<div class="text-xs text-gray-500">${member.alt_phone}</div>` : ""}
            ${member.reporting_time ? `<div class="text-xs text-gray-400">Time: ${member.reporting_time}</div>` : ""}
            ${member.note ? `<div class="text-xs text-gray-400">Note: ${member.note}</div>` : ""}
          </div>
          <button type="button" class="text-xs text-red-400 hover:text-red-300" data-group="${key}" data-index="${index}">
            Remove
          </button>
        </div>
      `;

      const removeSingleBtn = row.querySelector("button");
      removeSingleBtn.onclick = function() {
        teamData[key].splice(index, 1);

        if (teamData[key].length === 0) {
          delete teamData[key];
        }

        renderTeamPreview();
      };

      list.appendChild(row);
    });

    block.appendChild(header);
    block.appendChild(list);
    preview.appendChild(block);
  });

  setEditVisibility(true);
  setFormDisabled(false);
  updateTeamCount();
}


// ===== LOAD SAVED TEAM FROM DB =====

async function loadSavedTeamIfExists() {
  const { data, error } = await db
    .from("team_assignments")
    .select("*")
    .eq("quotation_id", quotationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("LOAD SAVED TEAM ERROR:", error);
    return;
  }

  if (!data || data.length === 0) {
    return;
  }

  teamData = {};

  data.forEach((member) => {
    const key = getGroupKey(member.role_name || "", member.day || "");

    if (!teamData[key]) {
      teamData[key] = [];
    }

    teamData[key].push({
      role_name: member.role_name || "",
      day: member.day || "",
      member_name: member.member_name || "",
      phone: member.phone || "",
      alt_phone: member.alt_phone || "",
      reporting_time: member.reporting_time || "",
      note: member.note || ""
    });
  });

  isTeamSaved = true;
  renderSavedState();
}


// ===== INIT =====

window.addEventListener("DOMContentLoaded", async () => {
  try {
    quotationId = getQuotationId();

    if (!quotationId) {
      return;
    }

    db = await waitForSupabaseReady();

    if (!db) {
      throw new Error("Supabase not initialized");
    }

    await loadClientData();
    await loadSavedTeamIfExists();
    updateTeamCount();
  } catch (err) {
    console.error("APP INIT ERROR:", err);
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

    quotationData = data;

    document.getElementById("clientName").innerText =
      quotationData?.client_name || "-";

    document.getElementById("eventName").innerText =
      getEventNameFromQuotation(quotationData);

    document.getElementById("eventDate").innerText =
      getEventDateText(quotationData);

    document.getElementById("venue").innerText =
      quotationData?.venue || "-";

  } catch (err) {
    console.error("LOAD CLIENT DATA ERROR:", err);
  }
}


// ===== ADD MEMBER =====

function addMember() {
  const role = document.getElementById("role").value;
  const day = document.getElementById("day").value;
  const memberName = document.getElementById("memberName").value.trim();
  const memberPhone = document.getElementById("memberPhone").value.trim();
  const memberAltPhone = document.getElementById("memberAltPhone").value.trim();
  const memberReportingTime = document.getElementById("memberReportingTime").value.trim();
  const memberNote = document.getElementById("memberNote").value.trim();

  if (!role || !memberName || !memberPhone) {
    return;
  }

  const key = getGroupKey(role, day);

  if (!teamData[key]) {
    teamData[key] = [];
  }

  teamData[key].push({
    role_name: role,
    day: day,
    member_name: memberName,
    phone: memberPhone,
    alt_phone: memberAltPhone,
    reporting_time: memberReportingTime,
    note: memberNote
  });

  isTeamSaved = false;
  clearMemberForm();
  renderTeamPreview();
}


// ===== SAVE TEAM =====

async function saveTeam() {
  const groupKeys = Object.keys(teamData);

  if (groupKeys.length === 0) {
    return;
  }

  try {
    const { error: deleteError } = await db
      .from("team_assignments")
      .delete()
      .eq("quotation_id", quotationId);

    if (deleteError) throw deleteError;

    let insertData = [];

    groupKeys.forEach((key) => {
      const members = teamData[key];

      members.forEach((member) => {
        insertData.push({
          quotation_id: quotationId,
          client_name: quotationData?.client_name || "",
          event_name: getEventNameFromQuotation(quotationData),
          event_date:
            quotationData?.event_start_date ||
            quotationData?.event_date ||
            "",
          venue: quotationData?.venue || "",
          role_name: member.role_name,
          day: member.day,
          member_name: member.member_name,
          phone: member.phone,
          alt_phone: member.alt_phone || "",
          reporting_time: member.reporting_time || "",
          note: member.note || ""
        });
      });
    });

    if (insertData.length === 0) {
      return;
    }

    const { error } = await db
      .from("team_assignments")
      .insert(insertData);

    if (error) throw error;

    isTeamSaved = true;
    renderSavedState();
  } catch (err) {
    console.error("SAVE TEAM ERROR:", err);
  }
}


// ===== EDIT TEAM =====

function editTeam() {
  isTeamSaved = false;
  renderTeamPreview();
}


// ===== VIEW TEAM SHEET =====

function viewTeamSheet() {
  window.location.href = `team-sheet.html?quotation=${quotationId}`;
}