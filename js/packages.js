document.addEventListener("DOMContentLoaded", function () {

  const packages = [

    {
      name: "Custom Package",
      price: "",
      description: "Manual Pricing"
    },

    {
      name: "Silver",
      price: 40000,
      description: "Basic Photography Coverage"
    },

    {
      name: "Gold",
      price: 70000,
      description: "Photography + Video"
    },

    {
      name: "Platinum",
      price: 90000,
      description: "Full Coverage + Cinematic"
    }

  ];

  const packageSelect = document.getElementById("packageSelect");
  const packageDetails = document.getElementById("packageDetails");
  const totalAmount = document.getElementById("totalAmount");

  packages.forEach(pkg => {

    const option = document.createElement("option");
    option.value = pkg.name;
    option.textContent = pkg.name;

    packageSelect.appendChild(option);

  });

  packageSelect.addEventListener("change", function () {

    const selected = packages.find(p => p.name === this.value);

    if (!selected) return;

    packageDetails.innerText = selected.description;

    if (selected.price) {
      totalAmount.value = selected.price;
    }

  });

});