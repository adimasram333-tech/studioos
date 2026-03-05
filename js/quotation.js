document.addEventListener("DOMContentLoaded", function () {

const printedAlbum = document.getElementById("printedAlbum");
const albumSheets = document.getElementById("albumSheets");

const freeGift = document.getElementById("freeGift");
const giftName = document.getElementById("giftName");

const total = document.getElementById("totalAmount");
const advance = document.getElementById("advanceAmount");
const balance = document.getElementById("balanceAmount");

const previewBtn = document.getElementById("previewBtn");


/* Album input toggle */

printedAlbum.addEventListener("change", function () {

albumSheets.classList.toggle("hidden", !this.checked);

});


/* Gift input toggle */

freeGift.addEventListener("change", function () {

giftName.classList.toggle("hidden", !this.checked);

});


/* Balance calculation */

advance.addEventListener("input", function () {

const totalVal = parseFloat(total.value) || 0;
const advVal = parseFloat(advance.value) || 0;

balance.value = totalVal - advVal;

});


/* Preview Quote */

previewBtn.addEventListener("click", async function () {

const client = document.getElementById("clientName").value;
const phone = document.getElementById("clientPhone").value;
const eventDate = document.getElementById("eventStartDate").value;
const packageName = document.getElementById("packageSelect").value;

const totalAmount = total.value;
const advanceAmount = advance.value;
const balanceAmount = balance.value;


/* Deliverables */

let deliverables = [];

if (document.getElementById("softCopy").checked)
deliverables.push("All Raw Soft Copy");

if (document.getElementById("traditionalVideo").checked)
deliverables.push("Traditional Video");

if (document.getElementById("cinematicHighlight").checked)
deliverables.push("Cinematic Highlight");

if (document.getElementById("printedAlbum").checked) {

const sheets = albumSheets.value || "";
deliverables.push("Printed Album " + sheets + " Sheets");

}

if (document.getElementById("freeGift").checked) {

const gift = giftName.value || "";
deliverables.push("Free Gift: " + gift);

}


if (!client || !phone) {

alert("Fill required fields");
return;

}


const quotationData = {

client_name: client,
phone: phone,
event_date: eventDate,
package: packageName,
deliverables: JSON.stringify(deliverables),
total: totalAmount,
advance: advanceAmount,
balance: balanceAmount,
status: "sent"

};


/* Save quotation */

const saved = await saveQuotation(quotationData);

if (saved && saved.id) {

window.location.href =
`proposal.html?id=${saved.id}`;

}

});

});