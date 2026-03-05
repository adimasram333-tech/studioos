const packages = [

{
name:"Custom Package",
price:"",
description:"Custom quotation"
},

{
name:"Silver",
price:40000,
description:"1 Photographer + Traditional Video"
},

{
name:"Gold",
price:70000,
description:"1 Photographer + 1 Videographer + Album"
},

{
name:"Platinum",
price:120000,
description:"Full Wedding Coverage + Cinematic + Album"
}

];

document.addEventListener("DOMContentLoaded",function(){

const packageSelect=document.getElementById("packageSelect");
const packageDetails=document.getElementById("packageDetails");
const totalAmount=document.getElementById("totalAmount");

packages.forEach(pkg=>{

const option=document.createElement("option");
option.value=pkg.name;
option.textContent=pkg.name;

packageSelect.appendChild(option);

});

packageSelect.addEventListener("change",function(){

const selected=packages.find(p=>p.name===this.value);

if(selected){

packageDetails.innerText=selected.description;

if(selected.price!==""){
totalAmount.value=selected.price;
}

}

});

});