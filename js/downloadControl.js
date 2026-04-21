// =============================
// DOWNLOAD + PAYMENT CONTROL (PRODUCTION SAFE - S3 READY)
// =============================

// EDGE FUNCTIONS
const CREATE_ORDER_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/create-order";

const VERIFY_PAYMENT_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/verify-payment";

// Razorpay
const RAZORPAY_KEY = "rzp_test_SYs7AftkGNrQNe";

// =============================
// ROLE
// =============================

function getUserRole() {
  return sessionStorage.getItem("role") || "guest";
}

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
// URL HELPERS (S3 SAFE)
// =============================

function normalizeUrl(url) {
  return String(url || "").split("?")[0].trim();
}

function getPreviewUrl(imageUrl, options = {}) {
  if (options.previewUrl) return normalizeUrl(options.previewUrl);
  return normalizeUrl(imageUrl);
}

// =============================
// DOWNLOAD ENGINE (SAFE)
// =============================

async function triggerDownload(imageUrl) {
  const safeUrl = normalizeUrl(imageUrl);

  try {
    const res = await fetch(safeUrl, { method: "GET", mode: "cors" });

    if (!res.ok) throw new Error("Fetch failed");

    const blob = await res.blob();

    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "photo.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn("Fallback download", err);

    const a = document.createElement("a");
    a.href = safeUrl;
    a.download = "photo.jpg";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// =============================
// PAYMENT MODAL
// =============================

function showPaymentModal(imageUrl, eventId, photographerId, eventName, options = {}) {

  let modal = document.getElementById("paymentModal");
  if (modal) return;

  if (!eventId) {
    alert("Event ID missing");
    return;
  }

  const safeImageUrl = normalizeUrl(imageUrl);
  const previewUrl = getPreviewUrl(safeImageUrl, options);

  modal = document.createElement("div");
  modal.id = "paymentModal";

  modal.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.9);
    display:flex;align-items:center;justify-content:center;
    z-index:9999;
  `;

  modal.innerHTML = `
    <div style="background:#111;padding:20px;border-radius:12px;text-align:center;max-width:300px">
      <div style="font-size:16px;margin-bottom:10px;color:#fff;">Download Photo</div>

      <input id="buyerName" placeholder="Your Name"
        style="width:100%;padding:8px;margin-bottom:6px;border-radius:6px;background:#1a1a1a;color:#fff;border:1px solid #333;" />

      <input id="buyerUpi" placeholder="UPI ID"
        style="width:100%;padding:8px;margin-bottom:6px;border-radius:6px;background:#1a1a1a;color:#fff;border:1px solid #333;" />

      <input id="buyerUpiName" placeholder="UPI Name"
        style="width:100%;padding:8px;margin-bottom:10px;border-radius:6px;background:#1a1a1a;color:#fff;border:1px solid #333;" />

      <button id="freeDownloadBtn"
        style="margin-top:10px;width:100%;background:#333;color:white;padding:8px;border-radius:8px;">
        Free (Preview)
      </button>

      <button id="payNowBtn"
        style="margin-top:10px;width:100%;background:#22c55e;color:white;padding:8px;border-radius:8px;">
        Pay ₹49
      </button>

      <button id="closeModal"
        style="margin-top:8px;background:#444;color:white;padding:6px 12px;border-radius:8px;">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // FREE DOWNLOAD
  document.getElementById("freeDownloadBtn").onclick = function () {
    triggerDownload(previewUrl);
    modal.remove();
  };

  // PAID DOWNLOAD
  document.getElementById("payNowBtn").onclick = async function () {

    try {
      const name = document.getElementById("buyerName").value.trim();
      const upi = document.getElementById("buyerUpi").value.trim();
      const upiName = document.getElementById("buyerUpiName").value.trim();

      if (!name || !upi || !upiName) {
        alert("Fill all fields");
        return;
      }

      const orderRes = await fetch(CREATE_ORDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ amount: 49 })
      });

      const orderData = await orderRes.json();
      const order = orderData.order;

      if (!order?.id) {
        alert("Payment init failed");
        return;
      }

      const rzp = new Razorpay({
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        order_id: order.id,

        handler: async function (response) {

          const verifyRes = await fetch(VERIFY_PAYMENT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": window.SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();

          if (!verifyData.success) {
            alert("Payment failed");
            return;
          }

          markImagePurchased(safeImageUrl);
          modal.remove();
          triggerDownload(safeImageUrl);
        }
      });

      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Payment error");
    }
  };

  document.getElementById("closeModal").onclick = () => modal.remove();
}

// =============================
// MAIN HANDLER
// =============================

window.handleDownload = function (imageUrl, eventId, photographerId, eventName, options = {}) {

  const safeImageUrl = normalizeUrl(imageUrl);
  window.lastDownloadedImage = safeImageUrl;

  const role = getUserRole();
  const guestFreeDownload = !!options.guestFreeDownload;

  if (role === "photographer" || role === "client") {
    triggerDownload(safeImageUrl);
    return;
  }

  if (guestFreeDownload) {
    triggerDownload(safeImageUrl);
    return;
  }

  if (isPurchased(safeImageUrl)) {
    triggerDownload(safeImageUrl);
    return;
  }

  showPaymentModal(safeImageUrl, eventId, photographerId, eventName, options);
};
