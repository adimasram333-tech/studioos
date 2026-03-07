// =============================
// SAFE PACKAGE SYSTEM
// =============================

async function loadPackages(){

const packageDropdown = document.getElementById("packageSelect")
const totalInput = document.getElementById("totalAmount")

if(!packageDropdown) return

try{

const { data, error } = await window.supabaseClient
.from("packages")
.select("*")
.order("price",{ascending:true})

if(error) throw error

packageDropdown.innerHTML = `<option value="">Select Package</option>`

data.forEach(pkg=>{

const option=document.createElement("option")
option.value=pkg.price
option.textContent=`${pkg.name} (₹${pkg.price})`

packageDropdown.appendChild(option)

})

}catch(err){

console.warn("Using fallback packages")

const fallbackPackages=[
{name:"Silver",price:50000},
{name:"Gold",price:80000},
{name:"Platinum",price:120000}
]

packageDropdown.innerHTML=`<option value="">Select Package</option>`

fallbackPackages.forEach(pkg=>{

const option=document.createElement("option")
option.value=pkg.price
option.textContent=`${pkg.name} (₹${pkg.price})`

packageDropdown.appendChild(option)

})

}

if(totalInput){

packageDropdown.addEventListener("change",function(){

totalInput.value=this.value||""

})

}

}

loadPackages()