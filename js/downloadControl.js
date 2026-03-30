// =============================
// DOWNLOAD + PAYMENT CONTROL (FINAL)
// =============================

// get role
function getUserRole() {
  return sessionStorage.getItem("role") || "guest";
}

// store last image
window.lastDownloadedImage = null;

// =============================
// PAYMENT MODAL
// =============================

function showPaymentModal() {

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

      <div style="font-size:16px; margin-bottom:10px">Unlock Full Gallery</div>

      <div style="font-size:12px; color:#aaa">
        Get access to download all photos
      </div>

      <div style="margin-top:10px; font-size:18px; font-weight:bold">
        ₹99
      </div>

      <button id="payNowBtn"
        style="margin-top:12px; background:#22c55e; color:white; padding:8px 16px; border-radius:8px;">
        Unlock Now
      </button>

      <button onclick="document.getElementById('paymentModal').remove()"
        style="margin-top:8px; background:#333; color:white; padding:6px 12px; border-radius:8px;">
        Cancel
      </button>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("payNowBtn").onclick = simulatePaymentSuccess;
}

// =============================
// SIMULATE PAYMENT (TEMP)
// =============================

function simulatePaymentSuccess() {

  alert("Payment Successful 🎉");

  // upgrade user to client
  sessionStorage.setItem("role", "client");

  // close modal
  const modal = document.getElementById("paymentModal");
  if (modal) modal.remove();

  // ✅ AUTO DOWNLOAD AFTER PAYMENT
  if (window.lastDownloadedImage) {
    triggerDownload(window.lastDownloadedImage);
  }
}

// =============================
// FORCE DOWNLOAD (FIXED)
// =============================

function triggerDownload(imageUrl) {
  fetch(imageUrl)
    .then(res => res.blob())
    .then(blob => {
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
// DOWNLOAD HANDLER
// =============================

window.handleDownload = function(imageUrl) {

  // store last clicked image
  window.lastDownloadedImage = imageUrl;

  const role = getUserRole();

  // CLIENT → allow
  if (role === "client") {
    triggerDownload(imageUrl);
    return;
  }

  // GUEST → show payment
  showPaymentModal();
};