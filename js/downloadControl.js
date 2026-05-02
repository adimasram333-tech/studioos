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

    await fetch(TRACK_USAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_ANON_KEY || ""
      },
      body: JSON.stringify({
        type: "download",
        user_id: options.userId || options.photographerId || null,
        event_id: eventId || null,
        photo_id: options.photoId || null,
        role,
        file_type: options.fileType || "unknown",
        file_size_bytes: Number(options.fileSizeBytes || 0)
      })
    });
  } catch (e) {
    console.warn("Usage tracking skipped", e);
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
// FORCE DOWNLOAD
// =============================

function triggerDownload(imageUrl, eventId = null, trackingOptions = {}) {
  fetch(imageUrl)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(blobUrl);

      trackDownloadUsage(imageUrl, eventId, {
        ...trackingOptions,
        fileSizeBytes: blob.size || trackingOptions.fileSizeBytes || 0
      });
    })
    .catch((err) => {
      console.error(err);
      alert("Download failed");
    });
}

// =============================
// PAYMENT MODAL
// =============================

async function showPaymentModal(imageUrl, eventId, photographerId, eventName) {
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
  modal.style.zIndex = 1200;

  const photoSellingPrice = await getEventPhotoSellingPrice(eventId);

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

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:1rem;">
        <button id="freeDownloadBtn" type="button"
          style="display:inline-flex; align-items:center; justify-content:center; padding:0.9rem 1rem; border-radius:0.95rem; font-size:0.86rem; font-weight:700; background:rgba(255,255,255,0.06); color:white; border:1px solid rgba(255,255,255,0.08); cursor:pointer;">
          Free Preview
        </button>

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

  document.getElementById("freeDownloadBtn").onclick = function () {
    const lowUrl = getLowQualityUrl(imageUrl);
    triggerDownload(lowUrl, eventId, {
      photographerId,
      fileType: "preview"
    });
    modal.remove();
  };

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
        event_name: eventName,
        image_url: imageUrl,
        photographer_id: photographerId,
        visitor_id,
        amount: photoSellingPrice,
        buyer_name,
        buyer_upi_id,
        buyer_upi_name
      };

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
              fileType: "original"
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
      fileType: "original"
    });
    return;
  }

  if (guestFreeDownload) {
    triggerDownload(imageUrl, eventId, {
      photographerId,
      fileType: "preview"
    });
    return;
  }

  if (isPurchased(imageUrl)) {
    triggerDownload(imageUrl, eventId, {
      photographerId,
      fileType: "original"
    });
    return;
  }

  const photoSellingAllowed = await canPhotographerSellPhotos(photographerId);

  if (!photoSellingAllowed) {
    showPhotoSellingUpgradeMessage();
    return;
  }

  await showPaymentModal(imageUrl, eventId, photographerId, eventName);
};
