// =============================
// DOWNLOAD + PAYMENT CONTROL (FINAL PRODUCTION VERSION)
// =============================

// ❌ OLD EDGE FUNCTION (not removed, just kept for safety)
const EDGE_FUNCTION_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/process-image-payment";

// ✅ NEW EDGE FUNCTIONS
const CREATE_ORDER_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/create-order";

const VERIFY_PAYMENT_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/verify-payment";

const TRACK_USAGE_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/track-usage";

// 🔥 IMPORTANT: use dynamic key (future safe)
const RAZORPAY_KEY = "rzp_test_SYs7AftkGNrQNe";
const MIN_PHOTO_SELLING_PRICE = 49;
const eventPhotoPriceCache = new Map();
let photoPaymentFlowLocked = false;

// get role
function getUserRole() {
  return sessionStorage.getItem("role") || "guest";
}

function safeString(value) {
  return String(value || "").trim();
}

function getPhotoPurchaseIdentity(photo) {
  const source = photo && typeof photo === "object" ? photo : {};

  return {
    photo_id: safeString(source.id),
    object_key: safeString(source.object_key),
    preview_key: safeString(source.preview_key),
    thumbnail_key: safeString(source.thumbnail_key),
    storage_provider: safeString(source.storage_provider || "s3"),
    bucket: safeString(source.bucket),
    file_size: Number(source.file_size || source.stored_file_size || 0),
    original_file_size: Number(source.original_file_size || 0),
    stored_file_size: Number(source.stored_file_size || source.file_size || 0),
    width: Number(source.width || 0),
    height: Number(source.height || 0)
  };
}

function normalizePhotoSellingPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return MIN_PHOTO_SELLING_PRICE;
  return Math.max(MIN_PHOTO_SELLING_PRICE, Math.floor(amount));
}

async function getEventPhotoSellingPrice(eventId) {
  const safeEventId = String(eventId || "").trim();

  if (!safeEventId) {
    return MIN_PHOTO_SELLING_PRICE;
  }

  const cached = eventPhotoPriceCache.get(safeEventId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.price;
  }

  try {
    if (typeof window.getSupabase !== "function") {
      return MIN_PHOTO_SELLING_PRICE;
    }

    const supabase = await window.getSupabase();

    if (!supabase) {
      return MIN_PHOTO_SELLING_PRICE;
    }

    const { data, error } = await supabase
      .from("events")
      .select("photo_selling_price")
      .eq("id", safeEventId)
      .maybeSingle();

    if (error) {
      console.error("Photo selling price fetch failed:", error);
      return MIN_PHOTO_SELLING_PRICE;
    }

    const price = normalizePhotoSellingPrice(data?.photo_selling_price);

    eventPhotoPriceCache.set(safeEventId, {
      price,
      expiresAt: Date.now() + 60000
    });

    return price;
  } catch (err) {
    console.error("Photo selling price fetch error:", err);
    return MIN_PHOTO_SELLING_PRICE;
  }
}

async function trackDownloadUsage(imageUrl, eventId, options = {}) {
  try {
    const role = getUserRole();
    const context = options.downloadLogContext || {};
    const photo = context.photo || options.photo || {};
    const downloadedBytes = Number(options.downloadedBytes || options.fileSizeBytes || 0);
    const fallbackFileSize = Number(
      photo.original_file_size ||
      photo.file_size ||
      photo.stored_file_size ||
      options.fileSizeBytes ||
      downloadedBytes ||
      0
    );

    await fetch(TRACK_USAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_ANON_KEY || ""
      },
      body: JSON.stringify({
        type: "download",
        user_id: options.userId || context.photographerId || options.photographerId || photo.user_id || null,
        event_id: context.eventId || eventId || photo.event_id || null,
        photo_id: context.photoId || options.photoId || photo.id || null,
        role,
        file_type: options.fileType || "unknown",
        file_size_bytes: Number.isFinite(fallbackFileSize) && fallbackFileSize > 0 ? Math.round(fallbackFileSize) : 0,
        downloaded_bytes: Number.isFinite(downloadedBytes) && downloadedBytes > 0 ? Math.round(downloadedBytes) : 0,
        download_type: context.downloadType || options.downloadType || options.fileType || `${role}_download`,
        source: context.source || "download_control_track_usage",
        object_key: context.objectKey || photo.object_key || null
      })
    });
  } catch (e) {
    console.warn("Usage tracking skipped", e);
  }
}

async function logDownloadToUsageTable(imageUrl, eventId, options = {}, downloadedBytes = 0) {
  try {
    if (typeof window.getSupabase !== "function") {
      return;
    }

    const supabase = await window.getSupabase();

    if (!supabase) {
      return;
    }

    const context = options.downloadLogContext || {};
    const photo = context.photo || options.photo || {};
    const safeDownloadedBytes = Number(downloadedBytes || options.fileSizeBytes || 0);
    const fallbackFileSize = Number(
      photo.original_file_size ||
      photo.file_size ||
      photo.stored_file_size ||
      options.fileSizeBytes ||
      safeDownloadedBytes ||
      0
    );

    const payload = {
      user_id: context.photographerId || options.photographerId || photo.user_id || null,
      event_id: context.eventId || eventId || photo.event_id || null,
      photo_id: photo.id || context.photoId || options.photoId || null,
      download_type: context.downloadType || options.downloadType || options.fileType || "download",
      object_key: photo.object_key || context.objectKey || null,
      file_size_bytes: Number.isFinite(fallbackFileSize) && fallbackFileSize > 0 ? Math.round(fallbackFileSize) : 0,
      downloaded_bytes: Number.isFinite(safeDownloadedBytes) && safeDownloadedBytes > 0 ? Math.round(safeDownloadedBytes) : 0,
      source: context.source || "download_control"
    };

    if (!payload.event_id && !payload.photo_id && !payload.object_key) {
      return;
    }

    const { error } = await supabase
      .from("usage_download_logs")
      .insert(payload);

    if (error) {
      console.warn("Direct usage_download_logs insert skipped:", error);
    }
  } catch (err) {
    console.warn("Direct usage_download_logs insert failed:", err);
  }
}

// store last image
window.lastDownloadedImage = null;

// =============================
// PHOTO SELLING SUBSCRIPTION GATE
// =============================

const PHOTO_SELLING_PLAN_CACHE_TTL_MS = 60000;
const photoSellingPlanCache = new Map();

function normalizePlanValue(value) {
  return String(value || "").trim().toLowerCase();
}

function isActivePaidPhotoSellingPlan(settings) {
  if (!settings) return false;

  const plan = normalizePlanValue(settings.plan);
  const status = normalizePlanValue(settings.subscription_status);
  const isPaid = settings.is_paid === true;
  const expiresAt = settings.plan_expires_at ? new Date(settings.plan_expires_at).getTime() : 0;
  const hasValidExpiry = Number.isFinite(expiresAt) && expiresAt > Date.now();

  return isPaid && status === "active" && hasValidExpiry && (plan === "basic" || plan === "pro");
}

async function canPhotographerSellPhotos(photographerId) {
  const safePhotographerId = String(photographerId || "").trim();

  if (!safePhotographerId) {
    return false;
  }

  const cached = photoSellingPlanCache.get(safePhotographerId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed;
  }

  try {
    if (typeof window.getSupabase !== "function") {
      console.error("Supabase helper missing for photo selling plan check");
      return false;
    }

    const supabase = await window.getSupabase();

    if (!supabase) {
      return false;
    }

    const { data, error } = await supabase
      .from("photographer_settings")
      .select("plan, subscription_status, is_paid, plan_expires_at")
      .eq("user_id", safePhotographerId)
      .maybeSingle();

    if (error) {
      console.error("Photo selling plan check failed:", error);
      return false;
    }

    const allowed = isActivePaidPhotoSellingPlan(data);

    photoSellingPlanCache.set(safePhotographerId, {
      allowed,
      expiresAt: Date.now() + PHOTO_SELLING_PLAN_CACHE_TTL_MS
    });

    return allowed;
  } catch (err) {
    console.error("Photo selling plan check error:", err);
    return false;
  }
}

function showPhotoSellingUpgradeMessage() {
  alert("Photo selling is available only on Basic and Pro plans. Please upgrade the photographer account to enable paid image downloads.");
}

// =============================
// PURCHASE STORAGE
// =============================

function getPurchasedImages() {
  return JSON.parse(sessionStorage.getItem("purchased_images") || "[]");
}

function markImagePurchased(url) {
  const list = getPurchasedImages();
  if (!list.includes(url)) {
    list.push(url);
    sessionStorage.setItem("purchased_images", JSON.stringify(list));
  }
}

function isPurchased(url) {
  return getPurchasedImages().includes(url);
}

// =============================
// LOW QUALITY URL (CLEAN FIX - CLOUDINARY REMOVED)
// =============================

function getLowQualityUrl(url) {
  try {
    // Cloudinary removed completely
    return url;
  } catch (e) {
    return url;
  }
}



// =============================
// ANDROID NATIVE FILE SAVE BRIDGE
// =============================

function isStudioOSAndroidApp() {
  try {
    const protocol = String(window.location.protocol || "").toLowerCase();

    if (
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    ) {
      return true;
    }

    return protocol === "capacitor:" || protocol === "file:" || protocol === "ionic:";
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

function getFileExtensionFromMime(mimeType) {
  const safeMime = String(mimeType || "").toLowerCase();

  if (safeMime.includes("png")) return "png";
  if (safeMime.includes("webp")) return "webp";
  if (safeMime.includes("gif")) return "gif";
  if (safeMime.includes("pdf")) return "pdf";
  if (safeMime.includes("jpeg") || safeMime.includes("jpg")) return "jpg";

  return "jpg";
}

function sanitizeStudioOSDownloadFileName(value, fallbackExtension = "jpg") {
  const safeValue = safeString(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const fallback = `studioos-photo-${Date.now()}.${fallbackExtension}`;
  const fileName = safeValue || fallback;

  if (/\.[a-z0-9]{2,6}$/i.test(fileName)) {
    return fileName;
  }

  return `${fileName}.${fallbackExtension}`;
}

function getStudioOSDownloadFileName(imageUrl, blob, trackingOptions = {}) {
  const context = trackingOptions.downloadLogContext || {};
  const photo = context.photo || trackingOptions.photo || {};
  const mimeType = blob?.type || "image/jpeg";
  const extension = getFileExtensionFromMime(mimeType);

  const objectKey =
    safeString(photo.object_key) ||
    safeString(context.objectKey) ||
    safeString(photo.preview_key) ||
    safeString(photo.thumbnail_key);

  if (objectKey) {
    const objectName = objectKey.split("/").filter(Boolean).pop();
    if (objectName) {
      return sanitizeStudioOSDownloadFileName(objectName, extension);
    }
  }

  try {
    const url = new URL(imageUrl, window.location.href);
    const pathName = decodeURIComponent(url.pathname || "");
    const urlName = pathName.split("/").filter(Boolean).pop();

    if (urlName) {
      return sanitizeStudioOSDownloadFileName(urlName.split("?")[0], extension);
    }
  } catch (error) {
    // ignore and use fallback
  }

  return sanitizeStudioOSDownloadFileName(`studioos-photo-${Date.now()}`, extension);
}

function blobToBase64ForStudioOSNativeSave(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = function () {
      try {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;

        if (!base64) {
          reject(new Error("File preparation failed"));
          return;
        }

        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(new Error("Unable to read file"));
    };

    reader.readAsDataURL(blob);
  });
}

async function savePhotoBlobInStudioOSAndroidApp(blob, imageUrl, trackingOptions = {}) {
  const saver = getStudioOSFileSaverPlugin();

  if (!saver || typeof saver.saveFile !== "function") {
    throw new Error("StudioOS native file saver is not available");
  }

  const mimeType = blob?.type || "image/jpeg";
  const base64Data = await blobToBase64ForStudioOSNativeSave(blob);
  const fileName = getStudioOSDownloadFileName(imageUrl, blob, trackingOptions);

  await saver.saveFile({
    base64Data,
    fileName,
    mimeType,
    target: "images"
  });

  return fileName;
}


// =============================
// FORCE DOWNLOAD
// =============================

async function triggerDownload(imageUrl, eventId = null, trackingOptions = {}) {
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to fetch image for download");
    }

    const blob = await response.blob();

    if (isStudioOSAndroidApp()) {
      await savePhotoBlobInStudioOSAndroidApp(blob, imageUrl, trackingOptions);
    } else {
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = getStudioOSDownloadFileName(imageUrl, blob, trackingOptions);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(blobUrl);
    }

    const downloadedBytes = blob.size || trackingOptions.fileSizeBytes || 0;

    trackDownloadUsage(imageUrl, eventId, {
      ...trackingOptions,
      fileSizeBytes: downloadedBytes,
      downloadedBytes
    });

    if (typeof window.logGalleryDownloadUsage === "function") {
      const baseLogContext = trackingOptions.downloadLogContext || {};
      const photo = baseLogContext.photo || trackingOptions.photo || null;

      window.logGalleryDownloadUsage({
        ...baseLogContext,
        eventId: baseLogContext.eventId || eventId,
        photo,
        photographerId: baseLogContext.photographerId || trackingOptions.photographerId || null,
        downloadType: baseLogContext.downloadType || trackingOptions.downloadType || "paid_download_original",
        source: baseLogContext.source || "download_control"
      }, downloadedBytes).catch(() => {});
    }
  } catch (err) {
    console.error("Download failed:", err);
    alert("Download failed");
  }
}
// =============================
// PAYMENT MODAL
// =============================

async function showPaymentModal(imageUrl, eventId, photographerId, eventName, options = {}) {
  let modal = document.getElementById("paymentModal");
  if (modal) return;

  if (!eventId) {
    console.error("❌ EVENT ID MISSING");
    alert("Event ID missing. Please reload page.");
    return;
  }

  modal = document.createElement("div");
  modal.id = "paymentModal";

  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.padding = "1rem";
  modal.style.background = "rgba(2,6,23,0.7)";
  modal.style.backdropFilter = "blur(8px)";
  modal.style.zIndex = 10050;

  const photoSellingPrice = await getEventPhotoSellingPrice(eventId);
  const photoIdentity = getPhotoPurchaseIdentity(options.photo);

  modal.innerHTML = `
    <div style="
      width:min(100%, 420px);
      border-radius:1.4rem;
      padding:1.2rem;
      background:rgba(15,23,42,0.96);
      border:1px solid rgba(255,255,255,0.08);
      box-shadow:0 24px 60px rgba(0,0,0,0.35);
      color:white;
    ">
      <div style="
        display:inline-flex;
        align-items:center;
        gap:0.4rem;
        padding:0.42rem 0.7rem;
        border-radius:999px;
        font-size:0.72rem;
        font-weight:600;
        letter-spacing:0.06em;
        text-transform:uppercase;
        background:rgba(99,102,241,0.12);
        border:1px solid rgba(99,102,241,0.24);
        color:rgb(199 210 254);
      ">Photo Download</div>

      <div style="font-size:1.25rem; font-weight:800; color:white; margin-top:0.9rem;">Download Photo</div>
      <div style="font-size:0.88rem; line-height:1.55; color:rgba(255,255,255,0.7); margin-top:0.45rem;">
        Choose preview or unlock HD download.
      </div>

      <div style="margin-top:1rem; display:grid; gap:0.65rem;">
        <input id="buyerName" placeholder="Your Name"
          style="width:100%; padding:0.85rem 0.95rem; border-radius:0.95rem; background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.08); outline:none; box-sizing:border-box;" />

        <input id="buyerUpi" placeholder="UPI ID (example@upi)"
          style="width:100%; padding:0.85rem 0.95rem; border-radius:0.95rem; background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.08); outline:none; box-sizing:border-box;" />

        <input id="buyerUpiName" placeholder="UPI Name"
          style="width:100%; padding:0.85rem 0.95rem; border-radius:0.95rem; background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.08); outline:none; box-sizing:border-box;" />
      </div>

      <div id="paymentModalFeedback" style="
        display:none;
        margin-top:0.85rem;
        padding:0.8rem 0.9rem;
        border-radius:0.9rem;
        background:rgba(239,68,68,0.12);
        border:1px solid rgba(239,68,68,0.28);
        color:rgb(254 202 202);
        font-size:0.82rem;
        line-height:1.45;
      "></div>

      <div style="display:grid; grid-template-columns:1fr; gap:0.75rem; margin-top:1rem;">
        <button id="payNowBtn" type="button"
          style="display:inline-flex; align-items:center; justify-content:center; padding:0.9rem 1rem; border-radius:0.95rem; font-size:0.86rem; font-weight:700; background:rgb(79 70 229); color:white; border:1px solid transparent; cursor:pointer;">
          Pay ₹${photoSellingPrice}
        </button>
      </div>

      <button id="closeModal" type="button"
        style="margin-top:0.75rem; width:100%; display:inline-flex; align-items:center; justify-content:center; padding:0.82rem 1rem; border-radius:0.95rem; font-size:0.86rem; font-weight:700; background:transparent; color:rgba(255,255,255,0.72); border:1px solid rgba(255,255,255,0.08); cursor:pointer;">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("payNowBtn").onclick = async function () {
    const payBtn = document.getElementById("payNowBtn");
    const freeBtn = document.getElementById("freeDownloadBtn");
    const closeBtn = document.getElementById("closeModal");
    const feedback = document.getElementById("paymentModalFeedback");

    const setFeedback = (message) => {
      if (!feedback) return;
      feedback.innerText = message || "";
      feedback.style.display = message ? "block" : "none";
    };

    const setPaymentBusy = (busy, text = "Preparing...") => {
      if (payBtn) {
        payBtn.disabled = busy;
        payBtn.innerText = busy ? text : `Pay ₹${photoSellingPrice}`;
        payBtn.style.opacity = busy ? "0.65" : "1";
        payBtn.style.cursor = busy ? "not-allowed" : "pointer";
      }

      if (freeBtn) {
        freeBtn.disabled = busy;
        freeBtn.style.opacity = busy ? "0.65" : "1";
        freeBtn.style.cursor = busy ? "not-allowed" : "pointer";
      }

      if (closeBtn) {
        closeBtn.disabled = busy;
        closeBtn.style.opacity = busy ? "0.65" : "1";
        closeBtn.style.cursor = busy ? "not-allowed" : "pointer";
      }
    };

    if (photoPaymentFlowLocked) {
      return;
    }

    try {
      setFeedback("");

      const buyer_name = document.getElementById("buyerName").value.trim();
      const buyer_upi_id = document.getElementById("buyerUpi").value.trim();
      const buyer_upi_name = document.getElementById("buyerUpiName").value.trim();

      if (!buyer_name || !buyer_upi_id || !buyer_upi_name) {
        setFeedback("Please fill all details.");
        return;
      }

      if (typeof Razorpay !== "function") {
        setFeedback("Payment system is not ready. Please refresh and try again.");
        return;
      }

      photoPaymentFlowLocked = true;
      setPaymentBusy(true);

      const visitor_id =
        sessionStorage.getItem("visitor_id") || "guest_" + Date.now();

      const payload = {
        event_id: eventId,
        photo_id: photoIdentity.photo_id,
        image_url: imageUrl,
        object_key: photoIdentity.object_key,
        preview_key: photoIdentity.preview_key,
        thumbnail_key: photoIdentity.thumbnail_key,
        storage_provider: photoIdentity.storage_provider,
        bucket: photoIdentity.bucket,
        file_size: photoIdentity.file_size,
        original_file_size: photoIdentity.original_file_size,
        stored_file_size: photoIdentity.stored_file_size,
        width: photoIdentity.width,
        height: photoIdentity.height,
        photographer_id: photographerId,
        visitor_id,
        amount: photoSellingPrice,
        buyer_name,
        buyer_upi_id,
        buyer_upi_name
      };

      if (!photoIdentity.photo_id) {
        throw new Error("Photo ID missing. Please refresh gallery and try again.");
      }

      const orderRes = await fetch(CREATE_ORDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SUPABASE_ANON_KEY || "",
          "Authorization": `Bearer ${window.SUPABASE_ANON_KEY || ""}`
        },
        body: JSON.stringify({
          event_id: eventId,
          photographer_id: photographerId,
          photo_id: photoIdentity.photo_id,
          image_url: imageUrl
        })
      });

      let orderData = null;

      try {
        orderData = await orderRes.json();
      } catch (parseErr) {
        console.error("Create order response parse failed:", parseErr);
        throw new Error("Unable to start payment. Please try again.");
      }

      if (!orderRes.ok || !orderData?.success || !orderData?.order?.id || !orderData?.order?.amount) {
        console.error("Create order failed:", orderData);
        throw new Error(orderData?.error || "Unable to create payment order. Please try again.");
      }

      const order = orderData.order;
      const razorpayKey = orderData.razorpay_key_id || RAZORPAY_KEY;

      if (!razorpayKey) {
        console.error("Razorpay key missing from create-order response");
        throw new Error("Payment configuration missing. Please try again later.");
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "StudioOS",
        description: "Photo Purchase",
        order_id: order.id,

        method: {
          upi: true,
          wallet: true,
          card: false,
          netbanking: false
        },

        handler: async function (response) {
          try {
            if (payBtn) {
              payBtn.innerText = "Verifying...";
            }

            const verifyRes = await fetch(VERIFY_PAYMENT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": window.SUPABASE_ANON_KEY || "",
                "Authorization": `Bearer ${window.SUPABASE_ANON_KEY || ""}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payload
              })
            });

            let verifyData = null;

            try {
              verifyData = await verifyRes.json();
            } catch (parseErr) {
              console.error("Verify payment response parse failed:", parseErr);
              throw new Error("Payment completed but verification response failed.");
            }

            if (!verifyRes.ok || !verifyData?.success) {
              console.error("Payment verification failed:", verifyData);
              throw new Error(verifyData?.error || "Payment verification failed.");
            }

            markImagePurchased(imageUrl);
            modal.remove();
            photoPaymentFlowLocked = false;

            triggerDownload(imageUrl, eventId, {
              photographerId,
              fileType: "original",
              photo: options.photo || null,
              downloadLogContext: options.downloadLogContext || {
                eventId,
                photo: options.photo || null,
                photographerId,
                downloadType: "guest_paid_original",
                source: "download_control_payment_success"
              }
            });
          } catch (verifyErr) {
            console.error("Verify payment failed:", verifyErr);
            setFeedback(verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.");
            photoPaymentFlowLocked = false;
            setPaymentBusy(false);
          }
        },

        modal: {
          escape: true,
          ondismiss: function () {
            photoPaymentFlowLocked = false;
            setPaymentBusy(false);
          }
        },

        prefill: {
          name: buyer_name
        },

        theme: {
          color: "#4f46e5"
        }
      };

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response);
        const message =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment failed. Please try again.";

        setFeedback(message);
        photoPaymentFlowLocked = false;
        setPaymentBusy(false);
      });

      rzp.open();

    } catch (err) {
      console.error(err);
      setFeedback(err instanceof Error ? err.message : "Something went wrong.");
      photoPaymentFlowLocked = false;
      setPaymentBusy(false);
    }
  };

  document.getElementById("closeModal").onclick = function () {
    if (photoPaymentFlowLocked) return;
    modal.remove();
  };

  modal.addEventListener("click", function (event) {
    if (event.target === modal && !photoPaymentFlowLocked) {
      modal.remove();
    }
  });
}

// =============================
// DOWNLOAD HANDLER
// =============================

window.handleDownload = async function (imageUrl, eventId, photographerId, eventName, options = {}) {
  window.lastDownloadedImage = imageUrl;

  const role = getUserRole();
  const guestFreeDownload = !!options.guestFreeDownload;

  if (role === "client") {
    triggerDownload(imageUrl, eventId, {
      photographerId,
      fileType: "original",
      photo: options.photo || null,
      downloadLogContext: options.downloadLogContext || {
        eventId,
        photo: options.photo || null,
        photographerId,
        downloadType: "client_original",
        source: "download_control_client"
      }
    });
    return;
  }

  if (guestFreeDownload) {
    triggerDownload(imageUrl, eventId, {
      photographerId,
      fileType: "preview",
      photo: options.photo || null,
      downloadLogContext: options.downloadLogContext || {
        eventId,
        photo: options.photo || null,
        photographerId,
        downloadType: "guest_free_preview",
        source: "download_control_guest_free"
      }
    });
    return;
  }

  if (isPurchased(imageUrl)) {
    triggerDownload(imageUrl, eventId, {
      photographerId,
      fileType: "original",
      photo: options.photo || null,
      downloadLogContext: options.downloadLogContext || {
        eventId,
        photo: options.photo || null,
        photographerId,
        downloadType: "guest_purchased_original",
        source: "download_control_purchased"
      }
    });
    return;
  }

  const photoSellingAllowed = await canPhotographerSellPhotos(photographerId);

  if (!photoSellingAllowed) {
    showPhotoSellingUpgradeMessage();
    return;
  }

  await showPaymentModal(imageUrl, eventId, photographerId, eventName, options);
};
