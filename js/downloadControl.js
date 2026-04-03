//// =============================
// DOWNLOAD + PAYMENT CONTROL (FINAL FIXED PRO)
// =============================

// ❌ OLD EDGE FUNCTION (not removed, just kept for safety)
const EDGE_FUNCTION_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/process-image-payment";

// ✅ NEW EDGE FUNCTIONS
const CREATE_ORDER_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/create-order";

const VERIFY_PAYMENT_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/verify-payment";

// 🔥 IMPORTANT: use dynamic key (future safe)
const RAZORPAY_KEY = "rzp_test_SYs7AftkGNrQNe";

// get role
function getUserRole() {
  return sessionStorage.getItem("role") || "guest";
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
// LOW QUALITY URL
// =============================

function getLowQualityUrl(url) {
  try {
    if (!url.includes("/upload/")) return url;

    return url.replace(
      "/upload/",
      "/upload/q_30,w_800,l_text:Arial_40:StudioOS,o_50/"
    );
  } catch (e) {
    return url;
  }
}

// =============================
// FORCE DOWNLOAD
// =============================

function triggerDownload(imageUrl) {
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

  // ✅ FIX: eventId validation (CRITICAL)
  if (!eventId) {
    console.error("❌ EVENT ID MISSING");
    alert("Event ID missing. Please reload.");
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

  modal.innerHTML = `...`; // (UNCHANGED UI)

  document.body.appendChild(modal);

  document.getElementById("freeDownloadBtn").onclick = function () {
    const lowUrl = getLowQualityUrl(imageUrl);
    triggerDownload(lowUrl);
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

      // =============================
      // 🔥 STEP 1: CREATE ORDER
      // =============================
      const orderRes = await fetch(CREATE_ORDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: 49 })
      });

      // ✅ FIX: response check
      if (!orderRes.ok) {
        console.error("❌ HTTP ERROR:", orderRes.status);
        alert("Server error. Try again.");
        return;
      }

      const orderData = await orderRes.json();

      if (!orderData.success || !orderData.order) {
        console.error("Order Error:", orderData);
        alert("Order creation failed");
        return;
      }

      const order = orderData.order;

      // =============================
      // 🔥 STEP 2: OPEN RAZORPAY
      // =============================
      const options = {
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        name: "StudioOS",
        description: "Photo Purchase",
        order_id: order.id,

        handler: async function (response) {

          try {
            const verifyRes = await fetch(VERIFY_PAYMENT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payload
              })
            });

            if (!verifyRes.ok) {
              alert("Verification server error");
              return;
            }

            const verifyData = await verifyRes.json();

            if (!verifyData.success) {
              console.error("Verify Error:", verifyData);
              alert("Payment verification failed");
              return;
            }

            markImagePurchased(imageUrl);
            alert("Payment Successful 🎉");

            modal.remove();
            triggerDownload(imageUrl);

          } catch (err) {
            console.error("Verify Crash:", err);
            alert("Verification failed");
          }
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
      console.error("🔥 Crash:", err);
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

window.handleDownload = function (imageUrl, eventId, photographerId, eventName) {
  window.lastDownloadedImage = imageUrl;

  const role = getUserRole();

  if (role === "client") {
    triggerDownload(imageUrl);
    return;
  }

  if (isPurchased(imageUrl)) {
    triggerDownload(imageUrl);
    return;
  }

  showPaymentModal(imageUrl, eventId, photographerId, eventName);
};