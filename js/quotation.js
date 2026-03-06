const packageSelect = document.getElementById("packageSelect")
const totalInput = document.getElementById("totalAmount")
const advanceInput = document.getElementById("advanceAmount")
const balanceInput = document.getElementById("balanceAmount")

packageSelect.addEventListener("change",function(){

totalInput.value = this.value

calculateBalance()

})

advanceInput.addEventListener("input",calculateBalance)

function calculateBalance(){

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

}

document.getElementById("previewBtn").addEventListener("click",function(){

const quotation = {

clientName: document.getElementById("clientName").value,
eventDate: document.getElementById("startDate").value,

total: totalInput.value,
advance: advanceInput.value,
balance: balanceInput.value

}

localStorage.setItem("quotationData",JSON.stringify(quotation))

window.location.href="proposal.html"

})