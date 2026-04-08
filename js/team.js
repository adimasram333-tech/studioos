// ===== GLOBAL =====

let quotationId = null;
let db = null;
let quotationData = null;
let teamData = {};
let isTeamSaved = false;
let coverFile = null;


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


// ===== SET FORM DISABLED =====

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


// ===== EDIT BUTTON VISIBILITY =====

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
      isTeamSaved = false;
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

        isTeamSaved = false;
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


// ===== IMAGE COMPRESSION =====

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error("Failed to read image"));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;

          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Image compression failed"));
                return;
              }
              resolve(blob);
            },
            "image/jpeg",
            0.88
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error("Invalid image"));
      };

      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}


// ===== NORMALIZE TITLE COLOR =====

function normalizeTitleColor(r, g, b) {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness > 180) {
    r = Math.max(80, r - 90);
    g = Math.max(60, g - 90);
    b = Math.max(60, b - 90);
  }

  if (brightness < 70) {
    r = Math.min(210, r + 70);
    g = Math.min(180, g + 70);
    b = Math.min(180, b + 70);
  }

  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}


// ===== EXTRACT COLOR =====

async function extractColor(file) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error("Failed to read image for color extraction"));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = 50;
          canvas.height = 50;

          ctx.drawImage(img, 0, 0, 50, 50);

          const data = ctx.getImageData(0, 0, 50, 50).data;

          let r = 0;
          let g = 0;
          let b = 0;
          let count = 0;

          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }

          if (count === 0) {
            resolve("rgb(199,141,130)");
            return;
          }

          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);

          resolve(normalizeTitleColor(r, g, b));
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error("Invalid image for color extraction"));
      };

      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}


// ===== APPLY COVER STATUS =====

function applyCoverStatus(options = {}) {
  const {
    hasCustomImage = false,
    isSelected = false,
    imageUrl = ""
  } = options;

  const coverStatus = document.getElementById("coverStatus");
  const coverPreview = document.getElementById("coverPreview");
  const coverPreviewWrap = document.getElementById("coverPreviewWrap");
  const removeCoverBtn = document.getElementById("removeCoverBtn");

  if (!coverStatus || !coverPreview || !coverPreviewWrap || !removeCoverBtn) return;

  if (imageUrl) {
    coverPreview.src = imageUrl;
    coverPreviewWrap.classList.remove("hidden");
    removeCoverBtn.classList.remove("hidden");
  } else {
    coverPreview.src = "";
    coverPreviewWrap.classList.add("hidden");
    removeCoverBtn.classList.add("hidden");
  }

  if (isSelected) {
    coverStatus.innerText = "Custom image selected";
    return;
  }

  if (hasCustomImage) {
    coverStatus.innerText = "Custom image active";
    return;
  }

  coverStatus.innerText = "Default image";
}


// ===== HANDLE COVER INPUT =====

function initCoverHandlers() {
  const input = document.getElementById("coverInput");
  const removeBtn = document.getElementById("removeCoverBtn");

  if (input) {
    input.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      coverFile = file;

      const reader = new FileReader();
      reader.onload = function() {
        applyCoverStatus({
          hasCustomImage: false,
          isSelected: true,
          imageUrl: reader.result
        });
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", function() {
      const inputEl = document.getElementById("coverInput");
      if (inputEl) {
        inputEl.value = "";
      }

      coverFile = null;
      applyCoverStatus({
        hasCustomImage: false,
        isSelected: false,
        imageUrl: ""
      });
    });
  }
}


// ===== LOAD EXISTING COVER SETTINGS =====

async function loadExistingCoverSettings() {
  try {
    const { data: authData } = await db.auth.getUser();
    const user = authData?.user || null;

    if (!user?.id) {
      applyCoverStatus({
        hasCustomImage: false,
        isSelected: false,
        imageUrl: ""
      });
      return;
    }

    const { data, error } = await db
      .from("photographer_settings")
      .select("team_sheet_cover_image")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const imageUrl = data?.team_sheet_cover_image || "";

    applyCoverStatus({
      hasCustomImage: !!imageUrl,
      isSelected: false,
      imageUrl
    });
  } catch (err) {
    console.error("LOAD COVER SETTINGS ERROR:", err);
    applyCoverStatus({
      hasCustomImage: false,
      isSelected: false,
      imageUrl: ""
    });
  }
}


// ===== ENSURE PHOTOGRAPHER SETTINGS ROW =====

async function ensurePhotographerSettingsRow(userId) {
  const { data, error } = await db
    .from("photographer_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await db
      .from("photographer_settings")
      .insert({
        user_id: userId
      });

    if (insertError) {
      throw insertError;
    }
  }
}


// ===== REMOVE COVER FROM SETTINGS =====

async function clearStoredCoverIfRequested(userId) {
  const coverPreview = document.getElementById("coverPreview");
  const hasPreviewVisible =
    coverPreview &&
    coverPreview.src &&
    coverPreview.src.trim() !== "" &&
    !coverPreview.classList.contains("hidden");

  const inputEl = document.getElementById("coverInput");
  const hasSelectedFile = !!(inputEl && inputEl.files && inputEl.files[0]);

  if (hasPreviewVisible || hasSelectedFile || coverFile) {
    return;
  }

  await ensurePhotographerSettingsRow(userId);

  const { error } = await db
    .from("photographer_settings")
    .update({
      team_sheet_cover_image: null,
      team_sheet_title_color: null
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}


// ===== UPLOAD COVER IF NEEDED =====

async function uploadCoverIfNeeded(userId) {
  if (!coverFile) return;

  try {
    await ensurePhotographerSettingsRow(userId);

    const compressedBlob = await compressImage(coverFile);
    const titleColor = await extractColor(coverFile);
    const path = `${userId}/team-sheet.jpg`;

    const { error: uploadError } = await db.storage
      .from("team-sheet")
      .upload(path, compressedBlob, {
        upsert: true,
        contentType: "image/jpeg"
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = db.storage
      .from("team-sheet")
      .getPublicUrl(path);

    const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await db
      .from("photographer_settings")
      .update({
        team_sheet_cover_image: publicUrl,
        team_sheet_title_color: titleColor
      })
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    coverFile = null;

    const inputEl = document.getElementById("coverInput");
    if (inputEl) {
      inputEl.value = "";
    }

    applyCoverStatus({
      hasCustomImage: true,
      isSelected: false,
      imageUrl: publicUrl
    });

  } catch (err) {
    console.error("UPLOAD COVER ERROR:", err);
    throw err;
  }
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

    initCoverHandlers();
    await loadClientData();
    await loadExistingCoverSettings();
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
    const { data: authData } = await db.auth.getUser();
    const user = authData?.user || null;

    if (user?.id) {
      await uploadCoverIfNeeded(user.id);
      await clearStoredCoverIfRequested(user.id);
    }

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