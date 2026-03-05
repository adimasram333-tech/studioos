// PACKAGE DATA

const packages = {

silver: {
name: "Silver",
price: 50000
},

gold: {
name: "Gold",
price: 80000
},

platinum: {
name: "Platinum",
price: 120000
}

};


// PACKAGE SELECT

const packageSelect = document.getElementById("packageSelect");
const totalInput = document.getElementById("totalAmount");


if(packageSelect && totalInput){

packageSelect.addEventListener("change", function(){

const selected = this.value;

if(packages[selected]){

totalInput.value = packages[selected].price;

}

});

}