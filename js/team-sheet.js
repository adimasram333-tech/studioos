// =============================
// GLOBAL
// =============================

let quotationId = null;
let db = null;


// =============================
// GET QUOTATION ID
// =============================

function getQuotationId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("quotation") || params.get("id");
}


// =============================
// FORMAT DATE
// =============================

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


// =============================
// WAIT FOR SUPABASE
// =============================

async function waitForSupabaseReady() {
  let retries = 0;

  while (retries < 20) {
    if (typeof window.getSupabase === "function") {
      return await window.getSupabase();
    }

    await new Promise(resolve => setTimeout(resolve, 200));
    retries++;
  }

  throw new Error("Supabase not ready");
}


// =============================
// SAFE LOADING TEXT
// =============================

function setLoadingText(text) {
  const loadingEl = document.getElementById("loadingText");
  if (loadingEl) {
    loadingEl.innerText = text;
  }
}


// =============================
// GET CURRENT USER
// =============================

async function getCurrentUserSafe() {
  try {
    if (typeof window.getCurrentUser === "function") {
      return await window.getCurrentUser();
    }

    if (!db) return null;

    const { data } = await db.auth.getUser();
    return data?.user || null;
  } catch (err) {
    console.error("GET USER ERROR:", err);
    return null;
  }
}


// =============================
// GET QUOTATION DATA
// =============================

async function getQuotationData() {
  if (!quotationId) return null;

  const { data, error } = await db
    .from("quotations")
    .select("*")
    .eq("id", quotationId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// =============================
// GET EVENT NAME
// =============================

function getEventNameFromQuotation(data) {
  return (
    data?.event_category ||
    data?.event_type ||
    data?.package ||
    data?.event_name ||
    "-"
  );
}


// =============================
// GET EVENT DATE RANGE
// =============================

function getEventDateTextFromQuotation(data, teamRow = null) {
  const startRaw =
    data?.event_start_date ||
    data?.event_date ||
    teamRow?.event_date ||
    "";

  const endRaw =
    data?.event_end_date ||
    data?.end_date ||
    "";

  const start = formatDate(startRaw);
  const end = formatDate(endRaw);

  if (startRaw && endRaw && startRaw !== endRaw) {
    return `${start} → ${end}`;
  }

  return start;
}


// =============================
// INIT
// =============================

window.addEventListener("DOMContentLoaded", async () => {
  try {
    quotationId = getQuotationId();

    if (!quotationId) {
      alert("Invalid access");
      return;
    }

    db = await waitForSupabaseReady();

    if (!db) {
      throw new Error("Supabase not initialized");
    }

    await loadStudio();
    await loadTeamData();
  } catch (err) {
    console.error("TEAM SHEET INIT ERROR:", err);
    setLoadingText("Failed to load");
    alert("Failed to load team sheet");
  }
});


// =============================
// LOAD STUDIO
// =============================

async function loadStudio() {
  try {
    const user = await getCurrentUserSafe();

    if (!user?.id) {
      document.getElementById("studioName").innerText = "Studio Name";
      document.getElementById("studioPhone").innerText = "Phone";
      return;
    }

    const { data, error } = await db
      .from("photographer_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    document.getElementById("studioName").innerText =
      data?.studio_name || "Studio Name";

    document.getElementById("studioPhone").innerText =
      data?.phone || "Phone";
  } catch (err) {
    console.error("LOAD STUDIO ERROR:", err);
    document.getElementById("studioName").innerText = "Studio Name";
    document.getElementById("studioPhone").innerText = "Phone";
  }
}


// =============================
// LOAD TEAM DATA
// =============================

async function loadTeamData() {
  try {
    setLoadingText("Loading...");

    const { data, error } = await db
      .from("team_assignments")
      .select("*")
      .eq("quotation_id", quotationId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const quotation = await getQuotationData().catch(err => {
      console.error("QUOTATION FETCH ERROR:", err);
      return null;
    });

    if (!data || data.length === 0) {
      document.getElementById("clientName").innerText =
        quotation?.client_name || "-";

      document.getElementById("eventName").innerText =
        getEventNameFromQuotation(quotation);

      document.getElementById("eventDate").innerText =
        getEventDateTextFromQuotation(quotation);

      document.getElementById("venue").innerText =
        quotation?.venue || "-";

      document.getElementById("teamList").innerHTML =
        "<p class='text-gray-500 text-sm'>No team assigned</p>";
      return;
    }

    const first = data[0];

    document.getElementById("clientName").innerText =
      quotation?.client_name || first.client_name || "-";

    document.getElementById("eventName").innerText =
      getEventNameFromQuotation(quotation) !== "-"
        ? getEventNameFromQuotation(quotation)
        : (first.event_name || "-");

    document.getElementById("eventDate").innerText =
      getEventDateTextFromQuotation(quotation, first);

    document.getElementById("venue").innerText =
      quotation?.venue || first.venue || "-";

    const grouped = {};

    data.forEach(item => {
      const key = `${item.role_name || "-"}__${item.day || "-"}`;

      if (!grouped[key]) {
        grouped[key] = {
          role: item.role_name || "-",
          day: item.day || "-",
          members: []
        };
      }

      grouped[key].members.push(item);
    });

    renderTeam(grouped);
  } catch (err) {
    console.error("LOAD TEAM DATA ERROR:", err);
    document.getElementById("teamList").innerHTML =
      "<p class='text-red-500 text-sm'>Failed to load team data</p>";
  }
}


// =============================
// RENDER TEAM
// =============================

function renderTeam(grouped) {
  const container = document.getElementById("teamList");
  container.innerHTML = "";

  const keys = Object.keys(grouped);

  if (keys.length === 0) {
    container.innerHTML =
      "<p class='text-gray-500 text-sm'>No team assigned</p>";
    return;
  }

  keys.forEach(key => {
    const group = grouped[key];
    const roleBlock = document.createElement("div");
    roleBlock.className = "space-y-2";

    roleBlock.innerHTML = `
      <div class="border-b pb-2 mb-2">
        <h3 class="font-semibold text-sm">${group.role}</h3>
        <p class="text-xs text-gray-500 mt-1">${group.day}</p>
      </div>

      <div class="space-y-3 text-sm">
        ${group.members.map(m => `
          <div class="border border-gray-200 rounded-lg p-3 space-y-1">
            <div class="flex justify-between gap-3">
              <div>
                <div class="font-medium text-black">${m.member_name || "-"}</div>
                <div class="text-gray-600">${m.phone || "-"}</div>
                ${m.alt_phone ? `<div class="text-gray-500">${m.alt_phone}</div>` : ""}
              </div>

              <div class="text-right text-xs text-gray-500">
                ${m.reporting_time ? `<div>Time: ${m.reporting_time}</div>` : ""}
              </div>
            </div>

            ${m.note ? `<div class="text-xs text-gray-500">Note: ${m.note}</div>` : ""}
          </div>
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
  try {
    if (typeof window.html2pdf === "undefined") {
      alert("PDF library not loaded");
      return;
    }

    const element = document.body;

    const opt = {
      margin: 0,
      filename: "team-sheet.pdf",
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    await window.html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("DOWNLOAD PDF ERROR:", err);
    alert("Failed to download PDF");
  }
}


// =============================
// SHARE TEAM
// =============================

async function shareTeam() {
  try {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: "Team Assignment",
        text: "Event Team Details",
        url: url
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    alert("Team sheet link copied");
  } catch (err) {
    console.error("SHARE ERROR:", err);
    alert("Unable to share team sheet");
  }
}