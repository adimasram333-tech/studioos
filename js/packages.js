// js/packages.js

document.addEventListener("DOMContentLoaded", function () {

  const packages = [
    {
      name: "Wedding Basic",
      price: 80000,
      description: "2 Days Coverage, Traditional Video, Album"
    },
    {
      name: "Wedding Premium",
      price: 150000,
      description: "3 Days Coverage, Cinematic Highlight, Album + Drone"
    },
    {
      name: "Pre-Wedding",
      price: 40000,
      description: "1 Day Shoot, Cinematic Edit"
    },
    {
      name: "Birthday Event",
      price: 25000,
      description: "Full Event Coverage + Highlight"
    }
  ];

  const packageSelect = document.getElementById("packageSelect");
  const packageDetails = document.getElementById("packageDetails");
  const totalAmount = document.getElementById("totalAmount");

  if (!packageSelect) return;

  // Populate dropdown
  packages.forEach(pkg => {
    const option = document.createElement("option");
    option.value = pkg.name;
    option.textContent = pkg.name;
    packageSelect.appendChild(option);
  });

  // When package selected
  packageSelect.addEventListener("change", function () {
    const selected = packages.find(p => p.name === this.value);

    if (selected) {
      packageDetails.innerHTML = selected.description;
      totalAmount.value = selected.price;
    } else {
      packageDetails.innerHTML = "";
      totalAmount.value = "";
    }
  });

});