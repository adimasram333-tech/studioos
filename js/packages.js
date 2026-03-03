if (!localStorage.getItem("packages")) {
  localStorage.setItem("packages", JSON.stringify([]));
}

const packageType = document.getElementById("packageType");
const customPackageName = document.getElementById("customPackageName");
const packagePrice = document.getElementById("packagePrice");

const serviceSelect = document.getElementById("serviceSelect");
const serviceQty = document.getElementById("serviceQty");
const serviceDays = document.getElementById("serviceDays");
const addServiceBtn = document.getElementById("addServiceBtn");
const servicesContainer = document.getElementById("servicesContainer");

let currentServices = [];

packageType.addEventListener("change", function(){
  if(this.value === "Custom"){
    customPackageName.classList.remove("hidden");
  } else {
    customPackageName.classList.add("hidden");
  }
});

addServiceBtn.addEventListener("click", function(){

  const service = serviceSelect.value;
  const qty = parseInt(serviceQty.value);
  const days = parseInt(serviceDays.value);

  if (!service) return;

  const finalService = {
    name: service,
    qty,
    days
  };

  currentServices.push(finalService);
  renderServices();

  serviceSelect.value = "";
  serviceQty.value = 1;
  serviceDays.value = 1;
});

function renderServices(){
  servicesContainer.innerHTML = "";

  currentServices.forEach((service, index) => {

    const div = document.createElement("div");
    div.className = "flex justify-between items-center bg-white/10 p-2 rounded-xl";

    div.innerHTML = `
      <span>${service.qty} ${service.name} - ${service.days} Day</span>
      <button class="bg-red-600 px-3 rounded-xl">X</button>
    `;

    div.querySelector("button").addEventListener("click", function(){
      currentServices.splice(index,1);
      renderServices();
    });

    servicesContainer.appendChild(div);
  });
}

document.getElementById("savePackage").addEventListener("click", function(){

  let finalName = packageType.value;

  if (!finalName) {
    alert("Select package type");
    return;
  }

  if(finalName === "Custom"){
    if(!customPackageName.value.trim()){
      alert("Enter custom package name");
      return;
    }
    finalName = customPackageName.value.trim();
  }

  if (!packagePrice.value.trim()) {
    alert("Enter package price");
    return;
  }

  if (currentServices.length === 0) {
    alert("Add at least one service");
    return;
  }

  const packages = JSON.parse(localStorage.getItem("packages")) || [];

  packages.push({
    name: finalName,
    price: Number(packagePrice.value),
    services: currentServices
  });

  localStorage.setItem("packages", JSON.stringify(packages));

  packageType.value = "";
  customPackageName.value = "";
  customPackageName.classList.add("hidden");
  packagePrice.value = "";
  currentServices = [];
  renderServices();

  loadPackages();
});

function loadPackages() {
  const packages = JSON.parse(localStorage.getItem("packages")) || [];
  const list = document.getElementById("packageList");
  list.innerHTML = "";

  packages.forEach((pkg, index) => {

    const servicesList = pkg.services
      .map(service =>
        `<li>• ${service.qty} ${service.name} - ${service.days} Day</li>`
      )
      .join("");

    const div = document.createElement("div");
    div.className = "glass rounded-2xl p-4";

    div.innerHTML = `
      <h2 class="text-lg font-bold">${pkg.name}</h2>
      <p class="text-sm text-gray-400 mb-2">₹${pkg.price}</p>
      <ul class="text-sm mb-3">${servicesList}</ul>
      <button onclick="deletePackage(${index})"
      class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-sm">
      Delete
      </button>
    `;

    list.appendChild(div);
  });
}

function deletePackage(index){
  const packages = JSON.parse(localStorage.getItem("packages")) || [];
  packages.splice(index,1);
  localStorage.setItem("packages", JSON.stringify(packages));
  loadPackages();
}

loadPackages();