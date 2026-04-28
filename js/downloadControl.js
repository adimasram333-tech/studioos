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

// get role
function getUserRole() {
  return sessionStorage.getItem("role") || "guest";
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

function showPaymentModal(imageUrl, eventId, photographerId, eventName) {
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
  modal.style.top = 0;
  modal.style.left = 0;
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0,0,0,0.9)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = 9999;

  modal.innerHTML = `
    <div style="background:#111; padding:20px; border-radius:12px; text-align:center; max-width:300px">
      <div style="font-size:16px; margin-bottom:10px; color:#fff;">Download Photo</div>

      <input id="buyerName" placeholder="Your Name"
        style="width:100%; padding:8px; margin-bottom:6px; border-radius:6px; background:#1a1a1a; color:#fff; border:1px solid #333;" />

      <input id="buyerUpi" placeholder="UPI ID (example@upi)"
        style="width:100%; padding:8px; margin-bottom:6px; border-radius:6px; background:#1a1a1a; color:#fff; border:1px solid #333;" />

      <input id="buyerUpiName" placeholder="UPI Name"
        style="width:100%; padding:8px; margin-bottom:10px; border-radius:6px; background:#1a1a1a; color:#fff; border:1px solid #333;" />

      <button id="freeDownloadBtn"
        style="margin-top:10px; width:100%; background:#333; color:white; padding:8px; border-radius:8px;">
        Free (Preview Quality)
      </button>

      <button id="payNowBtn"
        style="margin-top:10px; width:100%; background:#22c55e; color:white; padding:8px; border-radius:8px;">
        Pay ₹49 (UPI)
      </button>

      <button id="closeModal"
        style="margin-top:8px; background:#444; color:white; padding:6px 12px; border-radius:8px;">
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
    try {
      const buyer_name = document.getElementById("buyerName").value.trim();
      const buyer_upi_id = document.getElementById("buyerUpi").value.trim();
      const buyer_upi_name = document.getElementById("buyerUpiName").value.trim();

      if (!buyer_name || !buyer_upi_id || !buyer_upi_name) {
        alert("Please fill all details");
        return;
      }

      const visitor_id =
        sessionStorage.getItem("visitor_id") || "guest_" + Date.now();

      const payload = {
        event_id: eventId,
        event_name: eventName,
        image_url: imageUrl,
        photographer_id: photographerId,
        visitor_id,
        amount: 49,
        buyer_name,
        buyer_upi_id,
        buyer_upi_name
      };

      const orderRes = await fetch(CREATE_ORDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ amount: 49 })
      });

      const orderData = await orderRes.json();
      const order = orderData.order;

      const options = {
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
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
          const verifyRes = await fetch(VERIFY_PAYMENT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": window.SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payload
            })
          });

          const verifyData = await verifyRes.json();

          if (!verifyData.success) {
            alert("Payment verification failed");
            return;
          }

          markImagePurchased(imageUrl);
          modal.remove();
          triggerDownload(imageUrl, eventId, {
            photographerId,
            fileType: "original"
          });
        },

        prefill: {
          name: buyer_name
        },

        theme: {
          color: "#22c55e"
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  document.getElementById("closeModal").onclick = function () {
    modal.remove();
  };
}

// =============================
// DOWNLOAD HANDLER
// =============================

window.handleDownload = function (imageUrl, eventId, photographerId, eventName, options = {}) {
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

  showPaymentModal(imageUrl, eventId, photographerId, eventName);
};
