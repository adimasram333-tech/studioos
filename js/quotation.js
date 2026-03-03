document.addEventListener("DOMContentLoaded", function () {

  const totalInput = document.getElementById("totalAmount");
  const advanceInput = document.getElementById("advanceAmount");
  const balanceInput = document.getElementById("balanceAmount");

  const albumCheckbox = document.getElementById("printedAlbum");
  const albumSheets = document.getElementById("albumSheets");

  const giftCheckbox = document.getElementById("freeGift");
  const giftName = document.getElementById("giftName");

  const startDate = document.getElementById("eventStartDate");
  const endDate = document.getElementById("eventEndDate");
  const eventDaysDisplay = document.getElementById("eventDaysDisplay");

  /* ===== Balance Calculation ===== */

  function calculateBalance() {
    const total = parseFloat(totalInput.value) || 0;
    const advance = parseFloat(advanceInput.value) || 0;
    balanceInput.value = total - advance;
  }

  advanceInput.addEventListener("input", calculateBalance);
  totalInput.addEventListener("input", calculateBalance);

  /* ===== Event Days ===== */

  function calculateEventDays() {
    if (startDate.value && endDate.value) {
      const start = new Date(startDate.value);
      const end = new Date(endDate.value);

      if (end < start) {
        eventDaysDisplay.innerText = "Invalid date range";
        return;
      }

      const diffDays =
        (end - start) / (1000 * 60 * 60 * 24) + 1;

      eventDaysDisplay.innerText =
        `Total Event Days: ${diffDays} Day(s)`;
    }
  }

  startDate.addEventListener("change", calculateEventDays);
  endDate.addEventListener("change", calculateEventDays);

  /* ===== Show / Hide ===== */

  albumCheckbox.addEventListener("change", function () {
    albumSheets.classList.toggle("hidden", !this.checked);
  });

  giftCheckbox.addEventListener("change", function () {
    giftName.classList.toggle("hidden", !this.checked);
  });

});