document.addEventListener("DOMContentLoaded", function () {

  const packageSelect = document.getElementById("packageSelect");
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

  /* ===== Default Packages ===== */

  const defaultPackages = [
    { name: "Silver", price: 25000 },
    { name: "Gold", price: 40000 },
    { name: "Platinum", price: 60000 }
  ];

  defaultPackages.forEach(pkg => {
    const option = document.createElement("option");
    option.value = pkg.name;
    option.textContent = `${pkg.name} - ₹${pkg.price}`;
    option.dataset.price = pkg.price;
    packageSelect.appendChild(option);
  });

  /* ===== Package Change ===== */

  packageSelect.addEventListener("change", function () {
    const selected = packageSelect.options[packageSelect.selectedIndex];
    const price = selected.dataset.price;

    if (price) {
      totalInput.value = price;
      calculateBalance();
    }
  });

  /* ===== Balance Calculation ===== */

  function calculateBalance() {
    const total = parseFloat(totalInput.value) || 0;
    const advance = parseFloat(advanceInput.value) || 0;
    balanceInput.value = total - advance;
  }

  advanceInput.addEventListener("input", calculateBalance);

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

  /* ===== Show / Hide Fields ===== */

  albumCheckbox.addEventListener("change", function () {
    albumSheets.classList.toggle("hidden", !this.checked);
  });

  giftCheckbox.addEventListener("change", function () {
    giftName.classList.toggle("hidden", !this.checked);
  });

});