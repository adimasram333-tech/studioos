// =============================
// DOWNLOAD CONTROL MODULE (FINAL)
// =============================

// get role safely
function getUserRole() {
  return sessionStorage.getItem("role") || "guest";
}

// show upgrade message
function showUpgradeMessage() {

  let modal = document.getElementById("upgradeModal");

  if (modal) return;

  modal = document.createElement("div");
  modal.id = "upgradeModal";

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
    <div style="background:#111; padding:20px; border-radius:12px; text-align:center">
      <div style="font-size:16px; margin-bottom:10px">🔒 Download Locked</div>
      <div style="font-size:12px; color:#aaa">Contact photographer to unlock downloads</div>

      <button 
        style="margin-top:12px; background:#4f46e5; color:white; padding:6px 12px; border-radius:8px; font-size:12px"
        onclick="document.getElementById('upgradeModal').remove()"
      >
        OK
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

// main download handler
window.handleDownload = function(imageUrl) {

  const role = getUserRole();

  // =============================
  // CLIENT → ALLOW DOWNLOAD
  // =============================
  if (role === "client") {

    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "photo.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return;
  }

  // =============================
  // GUEST → BLOCK DOWNLOAD
  // =============================
  showUpgradeMessage();
};