// js/quotation.js

document.addEventListener("DOMContentLoaded", function () {

  const packageSelect = document.getElementById("packageSelect");
  const totalInput = document.getElementById("totalAmount");
  const advanceInput = document.getElementById("advanceAmount");
  const balanceInput = document.getElementById("balanceAmount");
  const previewBtn = document.getElementById("previewBtn");

  const startDate = document.getElementById("eventStartDate");
  const endDate = document.getElementById("eventEndDate");
  const eventDaysDisplay = document.getElementById("eventDaysDisplay");

  /* ================================
     SAFETY CHECK (Prevent JS crash)
  ================================= */

  if (!packageSelect || !previewBtn) {
    console.error("Required elements not found in quotation page.");
    return;
  }

  /* ================================
     LOAD DEFAULT PACKAGES
  ================================= */

  const defaultPackages = [
    { name: "Silver", price: 25000 },
    { name: "Gold", price: 40000 },
    { name: "Platinum", price: 60000 }
  ];

  // Prevent duplicate loading
  if (packageSelect.options.length <= 2) {
    defaultPackages.forEach(pkg => {
      const option = document.createElement("option");
      option.value = pkg.name;
      option.textContent = `${pkg.name} - ₹${pkg.price}`;
      option.dataset.price = pkg.price;
      packageSelect.appendChild(option);
    });
  }

  /* ================================
     PACKAGE CHANGE
  ================================= */

  packageSelect.addEventListener("change", function () {
    const selectedOption =
      packageSelect.options[packageSelect.selectedIndex];

    const price = selectedOption.dataset.price;

    if (price) {
      totalInput.value = price;
      calculateBalance();
    } else {
      totalInput.value = "";
      calculateBalance();
    }
  });

  /* ================================
     BALANCE CALCULATION
  ================================= */

  advanceInput.addEventListener("input", calculateBalance);
  totalInput.addEventListener("input", calculateBalance);

  function calculateBalance() {
    const total = parseFloat(totalInput.value) || 0;
    const advance = parseFloat(advanceInput.value) || 0;

    const balance = total - advance;

    balanceInput.value = balance >= 0 ? balance : 0;
  }

  /* ================================
     EVENT DAYS CALCULATION
  ================================= */

  function calculateEventDays() {
    if (startDate.value && endDate.value) {
      const start = new Date(startDate.value);
      const end = new Date(endDate.value);

      if (end < start) {
        eventDaysDisplay.innerText = "End date must be after start date";
        return;
      }

      const diffTime = end - start;
      const diffDays =
        diffTime / (1000 * 60 * 60 * 24) + 1;

      eventDaysDisplay.innerText =
        `Total Event Days: ${diffDays} Day(s)`;
    } else {
      eventDaysDisplay.innerText = "";
    }
  }

  if (startDate && endDate) {
    startDate.addEventListener("change", calculateEventDays);
    endDate.addEventListener("change", calculateEventDays);
  }

  /* ================================
     PREVIEW BUTTON
  ================================= */

  previewBtn.addEventListener("click", function () {

    const clientName =
      document.getElementById("clientName").value.trim();

    const phone =
      document.getElementById("clientPhone").value.trim();

    if (!clientName || !phone) {
      alert("Please fill required fields");
      return;
    }

    alert("Quotation Preview Ready ✅");
  });

});