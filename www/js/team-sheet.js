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

function showTeamSheetToast(message, type = "error") {
  const existingToast = document.getElementById("studioosTeamSheetToast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = "studioosTeamSheetToast";
  toast.style.position = "fixed";
  toast.style.left = "50%";
  toast.style.bottom = "calc(24px + env(safe-area-inset-bottom, 0px))";
  toast.style.transform = "translateX(-50%)";
  toast.style.width = "min(calc(100% - 32px), 360px)";
  toast.style.zIndex = "2147482700";
  toast.style.padding = "0.9rem 1rem";
  toast.style.borderRadius = "1rem";
  toast.style.background = type === "success" ? "rgba(15,23,42,0.96)" : "rgba(127,29,29,0.96)";
  toast.style.border = type === "success" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(248,113,113,0.35)";
  toast.style.boxShadow = "0 18px 55px rgba(0,0,0,0.38)";
  toast.style.backdropFilter = "blur(16px)";
  toast.style.webkitBackdropFilter = "blur(16px)";
  toast.style.color = "#ffffff";
  toast.style.fontSize = "0.88rem";
  toast.style.fontWeight = "800";
  toast.style.textAlign = "center";
  toast.style.pointerEvents = "none";
  toast.textContent = message || "Something went wrong";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 180ms ease, transform 180ms ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(8px)";
    setTimeout(() => {
      toast.remove();
    }, 220);
  }, 2200);
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
// ANDROID NATIVE FILE SAVE BRIDGE
// =============================

function isStudioOSNativeApp() {
  try {
    const protocol = String(window.location.protocol || "").toLowerCase();

    if (
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    ) {
      return true;
    }

    return protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:";
  } catch (error) {
    return false;
  }
}

function getStudioOSFileSaverPlugin() {
  try {
    return window.Capacitor?.Plugins?.StudioOSFileSaver || null;
  } catch (error) {
    return null;
  }
}

function blobToBase64ForTeamSheet(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = function() {
      try {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;

        if (!base64) {
          reject(new Error("PDF preparation failed"));
          return;
        }

        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function() {
      reject(new Error("Unable to read PDF file"));
    };

    reader.readAsDataURL(blob);
  });
}

function sanitizeTeamSheetFileName(value) {
  const safe = String(value || "team-sheet.pdf")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!safe) return "team-sheet.pdf";
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

function normalizeTeamSheetNativeFileUri(uri) {
  const value = String(uri || "").trim();

  if (!value) return "";

  if (value.startsWith("file://")) {
    return value;
  }

  // Some native bridges return a raw absolute filesystem path for cache files.
  // Capacitor Share requires a file:// URL in files[]. Convert only safe local paths.
  if (value.startsWith("/")) {
    return "file://" + value;
  }

  return value;
}

function isTeamSheetShareableFileUri(uri) {
  return String(uri || "").trim().toLowerCase().startsWith("file://");
}

async function saveTeamSheetPdfBlob(blob, fileName, options = {}) {
  const saver = getStudioOSFileSaverPlugin();

  if (!saver || typeof saver.saveFile !== "function") {
    throw new Error("ChitraBook AI native file saver is not available");
  }

  const safeFileName = sanitizeTeamSheetFileName(fileName);
  const base64Data = await blobToBase64ForTeamSheet(blob);
  const target = options.target || "downloads";

  const result = await saver.saveFile({
    base64Data,
    fileName: safeFileName,
    mimeType: "application/pdf",
    target
  });

  const rawUri = result?.uri || result?.fileUri || result?.path || "";
  const uri = normalizeTeamSheetNativeFileUri(rawUri);

  if (options.requireFileUri && !isTeamSheetShareableFileUri(uri)) {
    throw new Error("Team Sheet PDF could not be prepared as a shareable file. Please try again.");
  }

  return {
    fileName: safeFileName,
    uri
  };
}


async function shareTeamSheetPdfBlobNatively(blob, fileName, message) {
  const saver = getStudioOSFileSaverPlugin();

  if (!saver || typeof saver.shareFile !== "function") {
    throw new Error("ChitraBook AI native file share is not available");
  }

  const safeFileName = sanitizeTeamSheetFileName(fileName);
  const base64Data = await blobToBase64ForTeamSheet(blob);

  await saver.shareFile({
    base64Data,
    fileName: safeFileName,
    mimeType: "application/pdf",
    text: message || buildTeamSheetWhatsAppMessage(),
    title: "Send Team Sheet on WhatsApp"
  });

  return true;
}

// =============================
// PDF LIBRARY / EXPORT READINESS
// =============================

const STUDIOOS_TEAM_SHEET_HTML2PDF_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

let studioOSTeamSheetHtml2PdfLoadPromise = null;

async function ensureTeamSheetHtml2PdfLoaded() {
  if (typeof window.html2pdf === "function") {
    return true;
  }

  if (studioOSTeamSheetHtml2PdfLoadPromise) {
    return await studioOSTeamSheetHtml2PdfLoadPromise;
  }

  studioOSTeamSheetHtml2PdfLoadPromise = new Promise((resolve, reject) => {
    const existingScript =
      document.querySelector('script[data-studioos-team-sheet-html2pdf="true"]') ||
      Array.from(document.scripts || []).find(script =>
        String(script.src || "").includes("html2pdf")
      );

    if (existingScript) {
      if (typeof window.html2pdf === "function") {
        resolve(true);
        return;
      }

      existingScript.addEventListener("load", function() {
        if (typeof window.html2pdf === "function") {
          resolve(true);
        } else {
          reject(new Error("PDF library loaded but not initialized"));
        }
      }, { once: true });

      existingScript.addEventListener("error", function() {
        reject(new Error("PDF library failed to load"));
      }, { once: true });

      return;
    }

    const script = document.createElement("script");
    script.src = STUDIOOS_TEAM_SHEET_HTML2PDF_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.studioosTeamSheetHtml2pdf = "true";

    script.onload = function() {
      if (typeof window.html2pdf === "function") {
        resolve(true);
        return;
      }

      reject(new Error("PDF library loaded but not initialized"));
    };

    script.onerror = function() {
      reject(new Error("PDF library failed to load. Please check internet connection and try again."));
    };

    document.head.appendChild(script);
  });

  try {
    return await studioOSTeamSheetHtml2PdfLoadPromise;
  } catch (error) {
    studioOSTeamSheetHtml2PdfLoadPromise = null;
    throw error;
  }
}

async function waitForTeamSheetFonts(doc = document) {
  try {
    if (doc?.fonts?.ready) {
      await doc.fonts.ready;
    }
  } catch (error) {
    console.warn("Team Sheet font readiness skipped:", error);
  }
}

async function waitForTeamSheetImages(root) {
  if (!root) return;

  const images = Array.from(root.querySelectorAll("img") || []);

  if (!images.length) return;

  await Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });

      setTimeout(finish, 12000);
    });
  }));
}

function waitForTeamSheetNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function getStudioOSSharePlugin() {
  try {
    return window.Capacitor?.Plugins?.Share || null;
  } catch (error) {
    return null;
  }
}

function getTeamSheetPdfElement() {
  const element = document.querySelector(".print-shell");

  if (!element) {
    throw new Error("Printable sheet container not found");
  }

  return element;
}

function getTeamSheetPdfOptions(fileName = "team-sheet.pdf") {
  return {
    margin: 0,
    filename: fileName,
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
}

async function createTeamSheetPdfBlob(fileName = "team-sheet.pdf") {
  await ensureTeamSheetHtml2PdfLoaded();

  const element = getTeamSheetPdfElement();

  applyTeamSheetPdfExportMode();

  try {
    await waitForTeamSheetFonts(document);
    await waitForTeamSheetImages(element);
    await waitForTeamSheetNextPaint();

    return await window.html2pdf()
      .set(getTeamSheetPdfOptions(fileName))
      .from(element)
      .outputPdf("blob");
  } finally {
    removeTeamSheetPdfExportMode();
  }
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
  teamSheetPdfScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

  try {
    if (!teamSheetAccess.paidSharingAllowed) {
      showTeamSheetUpgradeModal();
      return;
    }

    const fileName = "team-sheet.pdf";

    if (isStudioOSNativeApp()) {
      const pdfBlob = await createTeamSheetPdfBlob(fileName);
      await saveTeamSheetPdfBlob(pdfBlob, fileName);
      showTeamSheetToast("Team Sheet saved to Downloads", "success");
      return;
    }

    await ensureTeamSheetHtml2PdfLoaded();

    const element = getTeamSheetPdfElement();

    applyTeamSheetPdfExportMode();

    try {
      await waitForTeamSheetFonts(document);
      await waitForTeamSheetImages(element);
      await waitForTeamSheetNextPaint();
      await window.html2pdf().set(getTeamSheetPdfOptions(fileName)).from(element).save();
    } finally {
      removeTeamSheetPdfExportMode();
    }
  } catch (err) {
    console.error("DOWNLOAD PDF ERROR:", err);
    showTeamSheetToast(err?.message || "Team Sheet PDF download failed", "error");
  } finally {
    removeTeamSheetPdfExportMode();
    window.scrollTo(0, teamSheetPdfScrollTop || 0);
  }
}

function buildTeamSheetWhatsAppMessage() {
  return `Hello Team,

Your event team sheet is attached as PDF.

Please check the assignment details, reporting time, and team notes carefully.

Generated by ChitraBook AI`;
}

function getTeamSheetShareButtons() {
  return Array.from(document.querySelectorAll("button, a")).filter((el) => {
    const onclickValue = String(el.getAttribute("onclick") || "");
    const idValue = String(el.id || "");
    const textValue = String(el.textContent || "").trim().toLowerCase();

    return (
      onclickValue.includes("shareTeam") ||
      idValue.toLowerCase().includes("shareteam") ||
      textValue === "share" ||
      textValue === "send on whatsapp"
    );
  });
}

function updateTeamSheetShareButtonText() {
  getTeamSheetShareButtons().forEach((el) => {
    if (String(el.textContent || "").trim().toLowerCase() === "share") {
      el.textContent = "Send on WhatsApp";
    }
  });
}

function setTeamSheetShareButtonState(isLoading) {
  getTeamSheetShareButtons().forEach((el) => {
    el.disabled = !!isLoading;

    if (isLoading) {
      el.dataset.originalText = el.dataset.originalText || el.textContent || "Send on WhatsApp";
      el.textContent = "Preparing PDF...";
      el.style.opacity = "0.75";
      el.style.cursor = "not-allowed";
    } else {
      el.textContent = el.dataset.originalText || "Send on WhatsApp";
      el.style.opacity = "1";
      el.style.cursor = "pointer";
    }
  });
}

function createTeamSheetPdfFileFromBlob(blob, fileName) {
  try {
    return new File([blob], sanitizeTeamSheetFileName(fileName), {
      type: "application/pdf",
      lastModified: Date.now()
    });
  } catch (error) {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", updateTeamSheetShareButtonText);
window.addEventListener("load", updateTeamSheetShareButtonText);


// =============================
// SHARE TEAM / SEND ON WHATSAPP
// =============================

async function shareTeam() {
  teamSheetPdfScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

  try {
    if (!teamSheetAccess.paidSharingAllowed) {
      showTeamSheetUpgradeModal();
      return;
    }

    setTeamSheetShareButtonState(true);

    const fileName = "team-sheet.pdf";
    const shareMessage = buildTeamSheetWhatsAppMessage();
    const pdfBlob = await createTeamSheetPdfBlob(fileName);

    if (isStudioOSNativeApp()) {
      // Production root fix:
      // Do not use Capacitor Share files[] here. On Android it rejects content://
      // and non-file URIs with "only file urls are supported".
      // Use StudioOSFileSaver.shareFile(), which shares through native
      // ACTION_SEND + FileProvider and sends the PDF + message without a public link.
      await shareTeamSheetPdfBlobNatively(pdfBlob, fileName, shareMessage);

      showTeamSheetToast("Share sheet opened", "success");
      return;
    }

    const pdfFile = createTeamSheetPdfFileFromBlob(pdfBlob, fileName);

    if (
      pdfFile &&
      navigator.share &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [pdfFile] })
    ) {
      await navigator.share({
        title: "Team Sheet",
        text: shareMessage,
        files: [pdfFile]
      });
      showTeamSheetToast("Share sheet opened", "success");
      return;
    }

    if (navigator.share && !pdfFile) {
      await navigator.share({
        title: "Team Sheet",
        text: shareMessage
      });
      return;
    }

    await ensureTeamSheetHtml2PdfLoaded();

    const element = getTeamSheetPdfElement();

    applyTeamSheetPdfExportMode();

    try {
      await waitForTeamSheetFonts(document);
      await waitForTeamSheetImages(element);
      await waitForTeamSheetNextPaint();
      await window.html2pdf().set(getTeamSheetPdfOptions(fileName)).from(element).save();
    } finally {
      removeTeamSheetPdfExportMode();
    }

    showTeamSheetToast("Team Sheet PDF downloaded. Attach it in WhatsApp.", "success");
  } catch (err) {
    console.error("SHARE ERROR:", err);
    showTeamSheetToast(err?.message || "Team Sheet share failed", "error");
  } finally {
    removeTeamSheetPdfExportMode();
    window.scrollTo(0, teamSheetPdfScrollTop || 0);
    setTeamSheetShareButtonState(false);
    updateTeamSheetShareButtonText();
  }
}
