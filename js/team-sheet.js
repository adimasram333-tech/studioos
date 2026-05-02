// =============================
// GLOBAL
// =============================

let quotationId = null;
let db = null;
let teamSheetPdfScrollTop = 0;
let teamSheetQuotation = null;
let teamSheetAccess = {
  ownerId: "",
  viewerIsOwner: false,
  paidSharingAllowed: false
};


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
// TEAM SHEET ACCESS GATE
// =============================

function normalizePlanValue(value) {
  return String(value || "").trim().toLowerCase();
}

function isActivePaidTeamSheetPlan(settings) {
  if (!settings) return false;

  const plan = normalizePlanValue(settings.plan);
  const status = normalizePlanValue(settings.subscription_status);
  const isPaid = settings.is_paid === true;
  const expiresAt = settings.plan_expires_at ? new Date(settings.plan_expires_at).getTime() : 0;
  const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now();

  return isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro");
}

function closeTeamSheetUpgradeModal() {
  const existing = document.getElementById("teamSheetUpgradeModal");
  if (existing) existing.remove();

  document.body.classList.remove("overflow-hidden");
}

function showTeamSheetUpgradeModal() {
  closeTeamSheetUpgradeModal();

  const modal = document.createElement("div");
  modal.id = "teamSheetUpgradeModal";
  modal.className = "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] p-5 text-white shadow-2xl">
      <div class="inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-200">
        Basic / Pro Required
      </div>

      <h2 class="mt-4 text-xl font-bold">
        Unlock team sharing
      </h2>

      <div class="mt-3 space-y-2 text-sm text-gray-300">
        <p>• Share Team Sheet link</p>
        <p>• Client/public team sheet access</p>
        <p>• Team Sheet PDF sharing</p>
      </div>

      <div class="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="text-sm font-semibold">Basic Plan</div>
        <div class="mt-1 text-2xl font-bold">₹499/mo</div>
        <p class="mt-2 text-xs text-gray-400">
          Upgrade to enable team sharing.
        </p>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          id="teamSheetUpgradeCancel"
          class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
          Cancel
        </button>

        <button
          type="button"
          id="teamSheetUpgradePlans"
          class="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
          View Plans
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add("overflow-hidden");

  const cancelBtn = document.getElementById("teamSheetUpgradeCancel");
  const plansBtn = document.getElementById("teamSheetUpgradePlans");

  if (cancelBtn) {
    cancelBtn.onclick = closeTeamSheetUpgradeModal;
  }

  if (plansBtn) {
    plansBtn.onclick = function() {
      window.location.href = "subscription.html";
    };
  }

  modal.addEventListener("click", function(e) {
    if (e.target === modal) {
      closeTeamSheetUpgradeModal();
    }
  });
}

function renderTeamSheetLockedScreen() {
  document.body.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,#1e293b,#0f172a)] text-white">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] p-5 text-center shadow-2xl">
        <div class="inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-200">
          Basic / Pro Required
        </div>

        <h2 class="mt-4 text-xl font-bold">
          Team Sheet sharing is locked
        </h2>

        <p class="mt-3 text-sm leading-6 text-gray-300">
          This Team Sheet can be shared publicly only when the photographer has an active Basic or Pro plan.
        </p>
      </div>
    </div>
  `;
}

async function evaluateTeamSheetAccess() {
  const quotation = teamSheetQuotation || await getQuotationData();
  teamSheetQuotation = quotation;

  const ownerId = quotation?.user_id || "";
  const viewer = await getCurrentUserSafe();
  const viewerId = viewer?.id || "";

  teamSheetAccess.ownerId = ownerId;
  teamSheetAccess.viewerIsOwner = !!ownerId && !!viewerId && String(ownerId) === String(viewerId);
  teamSheetAccess.paidSharingAllowed = false;

  if (!ownerId) {
    return false;
  }

  const { data: settings, error } = await db
    .from("photographer_settings")
    .select("plan, subscription_status, is_paid, plan_expires_at")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (error) {
    console.error("TEAM SHEET PLAN CHECK ERROR:", error);
  }

  teamSheetAccess.paidSharingAllowed = isActivePaidTeamSheetPlan(settings);

  if (!teamSheetAccess.paidSharingAllowed && !teamSheetAccess.viewerIsOwner) {
    renderTeamSheetLockedScreen();
    return false;
  }

  return true;
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

    const accessAllowed = await evaluateTeamSheetAccess();

    if (!accessAllowed) {
      return;
    }

    await loadStudio();
    await loadOwnerCoverAndColor();
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
    const ownerId = teamSheetAccess.ownerId || teamSheetQuotation?.user_id || "";

    if (!ownerId) {
      document.getElementById("studioName").innerText = "Studio Name";
      document.getElementById("studioPhone").innerText = "Phone";
      return;
    }

    const { data, error } = await db
      .from("photographer_settings")
      .select("*")
      .eq("user_id", ownerId)
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
// LOAD OWNER COVER + COLOR
// =============================

async function loadOwnerCoverAndColor() {
  try {
    const ownerId = teamSheetAccess.ownerId || teamSheetQuotation?.user_id || "";

    if (!ownerId) return;

    const { data: settings, error } = await db
      .from("photographer_settings")
      .select("team_sheet_cover_image, team_sheet_title_color")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const img = document.getElementById("coverImage");
    const title = document.getElementById("sheetTitle");

    if (img && settings?.team_sheet_cover_image) {
      img.src = settings.team_sheet_cover_image;
    }

    if (title && settings?.team_sheet_title_color) {
      title.style.color = settings.team_sheet_title_color;
    }
  } catch (err) {
    console.error("OWNER COVER LOAD ERROR:", err);
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

    const quotation = teamSheetQuotation || await getQuotationData().catch(err => {
      console.error("QUOTATION FETCH ERROR:", err);
      return null;
    });

    if (quotation) {
      teamSheetQuotation = quotation;
    }

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

function applyTeamSheetPdfExportMode() {
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
    if (!teamSheetAccess.paidSharingAllowed) {
      showTeamSheetUpgradeModal();
      return;
    }

    if (typeof window.html2pdf === "undefined") {
      console.error("PDF library not loaded");
      return;
    }

    const element = document.querySelector(".print-shell");

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
    if (!teamSheetAccess.paidSharingAllowed) {
      showTeamSheetUpgradeModal();
      return;
    }

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