// =============================
// LOAD PACKAGES FROM SUPABASE
// =============================

async function loadPackages(){

const packageSelect = document.getElementById("packageSelect")

if(!packageSelect) return

const { data, error } = await supabaseClient
.from("packages")
.select("*")
.order("price",{ascending:true})

if(error){

console.error("Package load error:",error)
return

}

packageSelect.innerHTML = `<option value="">Select Package</option>`

data.forEach(pkg => {

const option = document.createElement("option")

option.value = pkg.price
option.dataset.packageId = pkg.id

option.textContent = `${pkg.name} (₹${pkg.price})`

packageSelect.appendChild(option)

})

}


// =============================
// PACKAGE PRICE AUTO
// =============================

const packageSelect = document.getElementById("packageSelect")
const totalInput = document.getElementById("totalAmount")

if(packageSelect && totalInput){

packageSelect.addEventListener("change",function(){

totalInput.value = this.value || ""

})

}


// =============================
// INIT
// =============================

loadPackages()