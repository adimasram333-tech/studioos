// =============================
// DOWNLOAD + PAYMENT CONTROL (FINAL UPGRADED)
// =============================

// EDGE FUNCTION URL
const EDGE_FUNCTION_URL =
  "https://gnnaaagvlrmdveqxicob.supabase.co/functions/v1/process-image-payment";

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
// LOW QUALITY URL (WATERMARK)
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
    .catch(() => {
      alert("Download failed");
    });
}

// =============================
// PAYMENT MODAL (UPDATED)
// =============================

function showPaymentModal(imageUrl, eventId, photographerId) {
  let modal = document.getElementById("paymentModal");
  if (modal) return;

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

      <div style="font-size:16px; margin-bottom:10px">Download Photo</div>

      <button id="freeDownloadBtn"
        style="margin-top:10px; width:100%; background:#333; color:white; padding:8px; border-radius:8px;">
        Free (Low Quality)
      </button>

      <button id="payNowBtn"
        style="margin-top:10px; width:100%; background:#22c55e; color:white; padding:8px; border-radius:8px;">
        Pay ₹49 (HD)
      </button>

      <button id="closeModal"
        style="margin-top:8px; background:#444; color:white; padding:6px 12px; border-radius:8px;">
        Cancel
      </button>

    </div>
  `;

  document.body.appendChild(modal);

  // FREE DOWNLOAD
  document.getElementById("freeDownloadBtn").onclick = function () {
    const lowUrl = getLowQualityUrl(imageUrl);
    triggerDownload(lowUrl);
    modal.remove();
  };

  // PAID DOWNLOAD (EDGE FUNCTION CALL)
  document.getElementById("payNowBtn").onclick = async function () {
    try {
      const visitor_id =
        sessionStorage.getItem("visitor_id") || "guest_user";

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_id: eventId,
          image_url: imageUrl,
          photographer_id: photographerId,
          visitor_id: visitor_id,
          amount: 49
        })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Payment failed");
        return;
      }

      // mark purchased
      markImagePurchased(imageUrl);

      alert("Payment Successful 🎉");

      modal.remove();

      triggerDownload(imageUrl);

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  // CLOSE
  document.getElementById("closeModal").onclick = function () {
    modal.remove();
  };
}

// =============================
// DOWNLOAD HANDLER
// =============================

window.handleDownload = function (imageUrl, eventId, photographerId) {
  window.lastDownloadedImage = imageUrl;

  const role = getUserRole();

  // client → full access
  if (role === "client") {
    triggerDownload(imageUrl);
    return;
  }

  // already purchased
  if (isPurchased(imageUrl)) {
    triggerDownload(imageUrl);
    return;
  }

  // guest flow
  showPaymentModal(imageUrl, eventId, photographerId);
};