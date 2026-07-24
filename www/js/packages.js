// =============================
// PACKAGE ENGINE
// =============================

async function loadPackages(){

const packageDropdown =
document.getElementById("packageSelect")

const totalInput =
document.getElementById("totalAmount")

if(!packageDropdown) return



// =============================
// TRY LOAD FROM SUPABASE
// =============================

try{

const { data, error } =
await window.supabase
.from("packages")
.select("*")
.order("price",{ascending:true})

if(error) throw error


packageDropdown.innerHTML =
`<option value="">Select Package</option>`


data.forEach(pkg=>{

const option=document.createElement("option")

option.value=pkg.price
option.textContent=`${pkg.name} (₹${pkg.price})`

packageDropdown.appendChild(option)

})

}catch(err){

console.warn("Using fallback packages")



// =============================
// FALLBACK PACKAGES
// =============================

const fallbackPackages=[

{ name:"Silver", price:50000 },
{ name:"Gold", price:80000 },
{ name:"Platinum", price:120000 }

]

packageDropdown.innerHTML =
`<option value="">Select Package</option>`

fallbackPackages.forEach(pkg=>{

const option=document.createElement("option")

option.value=pkg.price
option.textContent=`${pkg.name} (₹${pkg.price})`

packageDropdown.appendChild(option)

})

}



// =============================
// AUTO FILL PRICE
// =============================

if(totalInput){

packageDropdown.addEventListener("change",function(){

totalInput.value=this.value||""

})

}

}



// =============================
// INIT
// =============================

loadPackages()