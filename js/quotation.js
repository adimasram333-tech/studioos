document.addEventListener("DOMContentLoaded", function () {

  const previewBtn = document.getElementById("previewBtn");

  const printedAlbum = document.getElementById("printedAlbum");
  const albumSheets = document.getElementById("albumSheets");

  const freeGift = document.getElementById("freeGift");
  const giftName = document.getElementById("giftName");

  const totalInput = document.getElementById("totalAmount");
  const advanceInput = document.getElementById("advanceAmount");
  const balanceInput = document.getElementById("balanceAmount");

  const startDate = document.getElementById("eventStartDate");
  const endDate = document.getElementById("eventEndDate");
  const eventDaysDisplay = document.getElementById("eventDaysDisplay");

  /* -------------------------
     Album Sheet Toggle
  -------------------------- */

  if (printedAlbum) {
    printedAlbum.addEventListener("change", function () {
      albumSheets.classList.toggle("hidden", !this.checked);
    });
  }

  /* -------------------------
     Free Gift Toggle
  -------------------------- */

  if (freeGift) {
    freeGift.addEventListener("change", function () {
      giftName.classList.toggle("hidden", !this.checked);
    });
  }

  /* -------------------------
     Balance Calculation
  -------------------------- */

  function calculateBalance() {

    const total = parseFloat(totalInput.value) || 0;
    const advance = parseFloat(advanceInput.value) || 0;

    balanceInput.value = total - advance;

  }

  totalInput.addEventListener("input", calculateBalance);
  advanceInput.addEventListener("input", calculateBalance);

  /* -------------------------
     Event Days Calculation
  -------------------------- */

  function calculateDays() {

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

  startDate.addEventListener("change", calculateDays);
  endDate.addEventListener("change", calculateDays);

  /* -------------------------
     Preview Button
  -------------------------- */

  previewBtn.addEventListener("click", async function () {

    const clientName = document.getElementById("clientName").value;
    const phone = document.getElementById("clientPhone").value;
    const eventDate = startDate.value;
    const packageName = document.getElementById("packageSelect").value;

    const total = totalInput.value;
    const advance = advanceInput.value;
    const balance = balanceInput.value;

    if (!clientName || !phone) {
      alert("Fill required fields");
      return;
    }

    const quotationData = {
      client_name: clientName,
      phone: phone,
      event_date: eventDate,
      package: packageName,
      total: total,
      advance: advance,
      balance: balance,
      status: "sent"
    };

    const saved = await saveQuotation(quotationData);

    if (saved && saved.id) {

      window.location.href = `proposal.html?id=${saved.id}`;

    } else {

      alert("Error saving quotation");

    }

  });

});