// =============================
// GLOBAL
// =============================

let quotationId = null;
let db = null;
let teamSheetPdfScrollTop = 0;


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
      setLoadingText("Invalid access");
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
    roleBlock.className = "space-y-4";

    const membersHtml = group.members.map(m => {
      return `
        <div class="member-card rounded-2xl p-4">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div class="min-w-0">
              <div class="text-[17px] sm:text-[18px] font-medium text-[#2f2b27] break-words">
                ${m.member_name || "-"}
              </div>

              <div class="mt-1 text-[14px] text-[#666059] break-words">
                ${m.phone || "-"}
              </div>

              ${m.alt_phone ? `
                <div class="mt-1 text-[13px] text-[#8a847d] break-words">
                  Alt: ${m.alt_phone}
                </div>
              ` : ""}
            </div>

            <div class="text-left sm:text-right text-[13px] text-[#8a847d] sm:min-w-[120px]">
              ${m.reporting_time ? `<div>Reporting: ${m.reporting_time}</div>` : ""}
            </div>
          </div>

          ${m.note ? `
            <div class="mt-3 text-[13px] text-[#6e675f] leading-6">
              Note: ${m.note}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    roleBlock.innerHTML = `
      <div class="border-b border-[#e8e1da] pb-3">
        <h3 class="role-title text-[20px] sm:text-[24px] leading-tight">
          ${group.role}
        </h3>
        <p class="role-subtitle text-[13px] sm:text-[14px] mt-1">
          ${group.day}
        </p>
      </div>

      <div class="space-y-3">
        ${membersHtml}
      </div>
    `;

    container.appendChild(roleBlock);
  });
}


// =============================
// PDF EXPORT HELPERS
// =============================

function isDesktopTeamSheetPdfExport() {
  return window.innerWidth > 768;
}

function ensureTeamSheetPdfExportStyles() {
  if (document.getElementById("team-sheet-pdf-export-styles")) return;

  const style = document.createElement("style");
  style.id = "team-sheet-pdf-export-styles";
  style.innerHTML = `
body.team-sheet-pdf-export{
  overflow:visible !important;
}

body.team-sheet-pdf-export *{
  animation:none !important;
  transition:none !important;
}

body.team-sheet-pdf-export .sheet-page{
  overflow:visible !important;
}

/* =========================================
   Desktop-only PDF fix
   Mobile export remains untouched
   ========================================= */
body.team-sheet-pdf-export.team-sheet-pdf-export-desktop .sheet-page{
  width:100% !important;
  max-width:100% !important;
  margin:0 auto !important;
  box-shadow:none !important;
}

body.team-sheet-pdf-export.team-sheet-pdf-export-desktop .member-card{
  padding:16px !important;
  border-radius:18px !important;
  break-inside:avoid !important;
  page-break-inside:avoid !important;
}

body.team-sheet-pdf-export.team-sheet-pdf-export-desktop .member-card > div:first-child{
  display:flex !important;
  flex-direction:column !important;
  align-items:flex-start !important;
  justify-content:flex-start !important;
  gap:8px !important;
}

body.team-sheet-pdf-export.team-sheet-pdf-export-desktop .member-card > div:first-child > div:last-child{
  text-align:left !important;
  min-width:0 !important;
  width:100% !important;
}

body.team-sheet-pdf-export.team-sheet-pdf-export-desktop .role-title{
  font-size:20px !important;
  line-height:1.2 !important;
}

body.team-sheet-pdf-export.team-sheet-pdf-export-desktop .role-subtitle{
  font-size:13px !important;
}

body.team-sheet-pdf-export.team-sheet-pdf-export-desktop #teamList{
  overflow:visible !important;
}
`;
  document.head.appendChild(style);
}

function applyTeamSheetPdfExportMode() {
  ensureTeamSheetPdfExportStyles();

  document.body.classList.add("team-sheet-pdf-export");

  if (isDesktopTeamSheetPdfExport()) {
    document.body.classList.add("team-sheet-pdf-export-desktop");
  }
}

function removeTeamSheetPdfExportMode() {
  document.body.classList.remove("team-sheet-pdf-export");
  document.body.classList.remove("team-sheet-pdf-export-desktop");
}


// =============================
// DOWNLOAD PDF
// =============================

async function downloadPDF() {
  try {
    if (typeof window.html2pdf === "undefined") {
      console.error("PDF library not loaded");
      return;
    }

    const element = document.querySelector(".sheet-page");

    if (!element) {
      console.error("Printable sheet container not found");
      return;
    }

    teamSheetPdfScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

    applyTeamSheetPdfExportMode();

    const opt = {
      margin: 0,
      filename: "team-sheet.pdf",
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f4f1ed",
        scrollX: 0,
        scrollY: 0,
        logging: false
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      },
      pagebreak: {
        mode: ["css", "legacy"]
      }
    };

    await window.html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("DOWNLOAD PDF ERROR:", err);
  } finally {
    removeTeamSheetPdfExportMode();
    window.scrollTo(0, teamSheetPdfScrollTop);
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

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    }
  } catch (err) {
    console.error("SHARE ERROR:", err);
  }
}