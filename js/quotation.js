document.addEventListener("DOMContentLoaded",function(){

const printedAlbum=document.getElementById("printedAlbum");
const albumSheets=document.getElementById("albumSheets");

const freeGift=document.getElementById("freeGift");
const giftName=document.getElementById("giftName");

const total=document.getElementById("totalAmount");
const advance=document.getElementById("advanceAmount");
const balance=document.getElementById("balanceAmount");

const previewBtn=document.getElementById("previewBtn");

const startDate=document.getElementById("eventStartDate");
const endDate=document.getElementById("eventEndDate");
const eventDays=document.getElementById("eventDaysDisplay");

printedAlbum.addEventListener("change",function(){
albumSheets.classList.toggle("hidden",!this.checked);
});

freeGift.addEventListener("change",function(){
giftName.classList.toggle("hidden",!this.checked);
});

advance.addEventListener("input",function(){

const totalVal=parseFloat(total.value)||0;
const advVal=parseFloat(advance.value)||0;

balance.value=totalVal-advVal;

});

function calculateDays(){

if(startDate.value && endDate.value){

const start=new Date(startDate.value);
const end=new Date(endDate.value);

const diff=(end-start)/(1000*60*60*24)+1;

if(diff>0){
eventDays.innerText="Total Event Days: "+diff+" Day(s)";
}

}

}

startDate.addEventListener("change",calculateDays);
endDate.addEventListener("change",calculateDays);

previewBtn.addEventListener("click",function(){

const client=document.getElementById("clientName").value;
const phone=document.getElementById("clientPhone").value;

if(!client || !phone){

alert("Please fill required fields");
return;

}

alert("Quotation Ready ✔");

});

});