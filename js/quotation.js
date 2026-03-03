document.addEventListener("DOMContentLoaded", function () {

  const previewBtn = document.getElementById("previewBtn");
  const printedAlbum = document.getElementById("printedAlbum");
  const albumSheets = document.getElementById("albumSheets");
  const freeGift = document.getElementById("freeGift");
  const giftName = document.getElementById("giftName");

  const startDate = document.getElementById("eventStartDate");
  const endDate = document.getElementById("eventEndDate");
  const eventDaysDisplay = document.getElementById("eventDaysDisplay");

  const totalInput = document.getElementById("totalAmount");
  const advanceInput = document.getElementById("advanceAmount");
  const balanceInput = document.getElementById("balanceAmount");

  /* =============================
     SHOW / HIDE CONDITIONAL FIELDS
  ==============================*/

  printedAlbum.addEventListener("change", function () {
    albumSheets.classList.toggle("hidden", !this.checked);
  });

  freeGift.addEventListener("change", function () {
    giftName.classList.toggle("hidden", !this.checked);
  });

  /* =============================
     BALANCE CALCULATION
  ==============================*/

  advanceInput.addEventListener("input", function () {
    const total = parseFloat(totalInput.value) || 0;
    const advance = parseFloat(advanceInput.value) || 0;
    balanceInput.value = total - advance;
  });

  /* =============================
     EVENT DAYS CALCULATION
  ==============================*/

  function calculateEventDays() {
    if (!startDate.value || !endDate.value) return;

    const start = new Date(startDate.value);
    const end = new Date(endDate.value);

    const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;

    if (diff > 0) {
      eventDaysDisplay.innerText = `Total Event Days: ${diff} Day(s)`;
    } else {
      eventDaysDisplay.innerText = "";
    }
  }

  startDate.addEventListener("change", calculateEventDays);
  endDate.addEventListener("change", calculateEventDays);

  /* =============================
     PREVIEW SYSTEM
  ==============================*/

  previewBtn.addEventListener("click", function () {

    const clientName = document.getElementById("clientName").value;
    const phone = document.getElementById("clientPhone").value;
    const category = document.getElementById("eventCategory").value;
    const packageName = document.getElementById("packageSelect").value;

    if (!clientName || !phone) {
      alert("Please fill required fields");
      return;
    }

    const previewHTML = `
      <div style="background:#0f172a;padding:20px;margin-top:20px;border-radius:15px">
        <h2 style="font-size:20px;font-weight:bold;margin-bottom:10px">Quotation Preview</h2>
        <p><strong>Client:</strong> ${clientName}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Event:</strong> ${category}</p>
        <p><strong>Package:</strong> ${packageName}</p>
        <p><strong>Total:</strong> ₹${totalInput.value}</p>
        <p><strong>Advance:</strong> ₹${advanceInput.value}</p>
        <p><strong>Balance:</strong> ₹${balanceInput.value}</p>
      </div>
    `;

    const previewContainer = document.createElement("div");
    previewContainer.innerHTML = previewHTML;

    document.body.appendChild(previewContainer);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });

  });

});