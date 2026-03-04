// js/packages.js

document.addEventListener("DOMContentLoaded", function () {

const packages = [

{
category:"Wedding",
name:"Wedding Basic",
price:80000,

services:[
{name:"Photographer (Traditional)",qty:1,days:2},
{name:"Videographer (Traditional)",qty:1,days:2},
{name:"Assistant",qty:1,days:2}
],

deliverables:[
"All Raw Soft Copy",
"Traditional Video",
"Printed Album"
]
},

{
category:"Wedding",
name:"Wedding Premium",
price:150000,

services:[
{name:"Photographer (Traditional)",qty:1,days:3},
{name:"Videographer (Traditional)",qty:1,days:3},
{name:"Candid Photographer",qty:1,days:2},
{name:"Cinematic Videographer",qty:1,days:2},
{name:"Drone",qty:1,days:1}
],

deliverables:[
"All Raw Soft Copy",
"Traditional Video",
"Cinematic Highlight",
"Printed Album"
]
},

{
category:"Pre-Wedding",
name:"Pre Wedding Shoot",
price:40000,

services:[
{name:"Candid Photographer",qty:1,days:1},
{name:"Cinematic Videographer",qty:1,days:1}
],

deliverables:[
"All Raw Soft Copy",
"Cinematic Highlight"
]
},

{
category:"Birthday",
name:"Birthday Event",
price:25000,

services:[
{name:"Photographer (Traditional)",qty:1,days:1}
],

deliverables:[
"All Raw Soft Copy"
]
}

];

const packageSelect = document.getElementById("packageSelect");
const packageDetails = document.getElementById("packageDetails");
const totalAmount = document.getElementById("totalAmount");

if(!packageSelect) return;

packages.forEach(pkg=>{

const option=document.createElement("option");
option.value=pkg.name;
option.textContent=pkg.name;

packageSelect.appendChild(option);

});

packageSelect.addEventListener("change",function(){

const selected=packages.find(p=>p.name===this.value);

if(!selected) return;

packageDetails.innerHTML=`Default Price: ₹${selected.price}`;

totalAmount.value=selected.price;

localStorage.setItem("selectedServices",JSON.stringify(selected.services));
localStorage.setItem("selectedDeliverables",JSON.stringify(selected.deliverables));

});

});