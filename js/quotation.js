const { jsPDF } = window.jspdf;

const packageSelect = document.getElementById("packageSelect");
const packageDetails = document.getElementById("packageDetails");
const totalAmount = document.getElementById("totalAmount");
const advanceAmount = document.getElementById("advanceAmount");
const balanceAmount = document.getElementById("balanceAmount");
const previewBtn = document.getElementById("previewBtn");
const previewSection = document.getElementById("previewSection");

const eventStartDate = document.getElementById("eventStartDate");
const eventEndDate = document.getElementById("eventEndDate");
const eventDaysDisplay = document.getElementById("eventDaysDisplay");

const softCopy = document.getElementById("softCopy");
const traditionalVideo = document.getElementById("traditionalVideo");
const cinematicHighlight = document.getElementById("cinematicHighlight");
const printedAlbum = document.getElementById("printedAlbum");
const albumSheets = document.getElementById("albumSheets");
const freeGift = document.getElementById("freeGift");
const giftName = document.getElementById("giftName");

let currentQuotation = null;

/* DATE FORMAT */
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/* SHOW HIDE */
printedAlbum.addEventListener("change", () => {
  albumSheets.classList.toggle("hidden", !printedAlbum.checked);
});

freeGift.addEventListener("change", () => {
  giftName.classList.toggle("hidden", !freeGift.checked);
});

/* EVENT DAYS */
function calculateEventDays() {
  if (!eventStartDate.value || !eventEndDate.value) return;
  const start = new Date(eventStartDate.value);
  const end = new Date(eventEndDate.value);
  const diffDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
  eventDaysDisplay.innerText = `Total Event Days: ${diffDays} Day(s)`;
}

eventStartDate.addEventListener("change", calculateEventDays);
eventEndDate.addEventListener("change", calculateEventDays);

/* LOAD PACKAGES */
function loadPackages() {
  const packages = JSON.parse(localStorage.getItem("packages")) || [];
  packages.forEach((pkg, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = pkg.name;
    packageSelect.appendChild(option);
  });
}
loadPackages();

/* PACKAGE SELECT */
packageSelect.addEventListener("change", function () {

  if (this.value === "custom") {
    packageDetails.innerHTML = "<p>Custom Package Selected</p>";
    totalAmount.removeAttribute("readonly");
    totalAmount.value = "";
    return;
  }

  const packages = JSON.parse(localStorage.getItem("packages")) || [];
  const selected = packages[this.value];
  if (!selected) return;

  totalAmount.setAttribute("readonly", true);
  totalAmount.value = selected.price;

  packageDetails.innerHTML = selected.services
    .map(s => `<li>• ${s.qty} ${s.name} - ${s.days} Day</li>`)
    .join("");
});

/* BALANCE */
advanceAmount.addEventListener("input", function () {
  const total = parseInt(totalAmount.value) || 0;
  const advance = parseInt(this.value) || 0;
  balanceAmount.value = total - advance;
});

/* PREVIEW */
previewBtn.addEventListener("click", function () {

  const deliverables = [];

  if (softCopy.checked) deliverables.push("All Raw Soft Copy");
  if (traditionalVideo.checked) deliverables.push("Traditional Video (Full Event)");
  if (cinematicHighlight.checked) deliverables.push("Cinematic Highlight");
  if (printedAlbum.checked) deliverables.push(`Printed Album - ${albumSheets.value} Sheets`);
  if (freeGift.checked) deliverables.push(`Free Gift: ${giftName.value}`);

  const deliverablesHTML = deliverables.map(d => `<li>• ${d}</li>`).join("");

  currentQuotation = {
    id: Date.now(),
    client: clientName.value,
    phone: clientPhone.value,
    start: eventStartDate.value,
    end: eventEndDate.value,
    total: totalAmount.value,
    advance: advanceAmount.value || 0,
    balance: balanceAmount.value || totalAmount.value,
    deliverables,
    services: packageDetails.innerText,
    status: "Draft"
  };

  previewSection.classList.remove("hidden");
  renderPreview(deliverablesHTML);
});

/* RENDER */
function renderPreview(deliverablesHTML) {

  const statusColor =
    currentQuotation.status === "Draft" ? "bg-yellow-500" :
    currentQuotation.status === "Sent" ? "bg-blue-500" :
    "bg-green-600";

  previewSection.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-xl font-bold">Quotation Preview</h2>
      <span class="px-3 py-1 text-sm rounded-full ${statusColor}">
        ${currentQuotation.status}
      </span>
    </div>

    <p><strong>Client:</strong> ${currentQuotation.client}</p>
    <p><strong>Event:</strong> ${formatDate(currentQuotation.start)} to ${formatDate(currentQuotation.end)}</p>
    <p><strong>${eventDaysDisplay.innerText}</strong></p>

    <hr class="my-4 border-white/20"/>

    <h3 class="font-semibold">Services</h3>
    <pre class="text-sm">${currentQuotation.services}</pre>

    <h3 class="font-semibold mt-3">Deliverables</h3>
    <ul>${deliverablesHTML}</ul>

    <hr class="my-4 border-white/20"/>

    <p><strong>Total:</strong> ₹${currentQuotation.total}</p>
    <p><strong>Advance:</strong> ₹${currentQuotation.advance}</p>
    <p><strong>Balance:</strong> ₹${currentQuotation.balance}</p>

    <div class="mt-5 space-y-2">
      ${currentQuotation.status === "Draft" ? `
        <button onclick="sendQuotation()"
          class="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-xl font-semibold">
          Send Quotation
        </button>
      ` : ""}

      ${currentQuotation.status === "Sent" ? `
        <button onclick="shareWhatsApp()"
          class="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-semibold">
          Share on WhatsApp
        </button>

        <button onclick="markAdvance()"
          class="w-full bg-emerald-700 hover:bg-emerald-800 p-3 rounded-xl font-semibold">
          Mark Advance Received
        </button>
      ` : ""}

      ${currentQuotation.status === "Confirmed" ? `
        <div class="w-full bg-gray-700 p-3 rounded-xl font-semibold text-center">
          Booking Confirmed
        </div>
      ` : ""}
    </div>
  `;
}

/* ===== 2 PAGE LUXURY PDF ===== */
function generatePDF() {

  const pdf = new jsPDF("p", "mm", "a4");
  const id = "QT-" + currentQuotation.id;
  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();

  /* PAGE 1 */
  pdf.setFillColor(198, 165, 64);
  pdf.rect(0, 0, pageWidth, 15, "F");

  pdf.setFontSize(26);
  pdf.setFont("helvetica", "bold");
  pdf.text("Wedding Photography Proposal", margin, 50);

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "normal");
  pdf.text("StudioOS Photography", margin, 65);

  pdf.setFontSize(12);
  pdf.text(`Prepared For: ${currentQuotation.client}`, margin, 85);
  pdf.text(
    `Event Date: ${formatDate(currentQuotation.start)} to ${formatDate(currentQuotation.end)}`,
    margin,
    95
  );

  pdf.setFontSize(11);
  pdf.setTextColor(100);
  pdf.text(
    "Capturing timeless moments with elegance, emotion and excellence.",
    margin,
    120
  );

  pdf.addPage();

  /* PAGE 2 */
  let y = 25;

  pdf.setTextColor(0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Services & Coverage", margin, y);

  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  currentQuotation.services.split("\n").forEach(line => {
    pdf.text(line.replace("• ", ""), margin + 5, y);
    y += 7;
  });

  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Deliverables", margin, y);

  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  currentQuotation.deliverables.forEach(d => {
    pdf.text(d, margin + 5, y);
    y += 7;
  });

  y += 15;

  pdf.setFillColor(245, 241, 230);
  pdf.rect(margin, y, pageWidth - margin * 2, 30, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Investment Summary", margin + 5, y + 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(`Total: ₹${currentQuotation.total}`, margin + 5, y + 18);
  pdf.text(`Advance: ₹${currentQuotation.advance}`, margin + 70, y + 18);
  pdf.text(`Balance: ₹${currentQuotation.balance}`, margin + 130, y + 18);

  y += 45;

  pdf.setFontSize(11);
  pdf.setTextColor(80);
  pdf.text(
    "Thank you for trusting StudioOS with your special celebration.\n" +
    "We are committed to delivering timeless memories with professionalism,\n" +
    "creativity and dedication. Your satisfaction remains our highest priority.",
    margin,
    y
  );

  y += 30;

  pdf.setTextColor(0);
  pdf.text("__________________________", margin, y);
  pdf.text("Authorized Signature", margin, y + 8);

  pdf.save(`StudioOS_Wedding_Proposal_${id}.pdf`);
}

/* LIFECYCLE */
function sendQuotation() {
  currentQuotation.status = "Sent";
  generatePDF();
  renderPreview("");
}

function markAdvance() {
  currentQuotation.status = "Confirmed";
  renderPreview("");
}

/* WHATSAPP */
function shareWhatsApp() {

  const message =
`Hello ${currentQuotation.client},

Please find attached your quotation (PDF).

Total: ₹${currentQuotation.total}
Advance Required: ₹${currentQuotation.advance}

Regards,
StudioOS`;

  const url = `https://wa.me/91${currentQuotation.phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}