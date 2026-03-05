const packagePrices = {
silver:50000,
gold:80000,
platinum:120000
}


const packageSelect = document.getElementById("packageSelect")
const totalInput = document.getElementById("totalAmount")


packageSelect.addEventListener("change",()=>{

const price = packagePrices[packageSelect.value]

if(price){

totalInput.value = price

}

})


const advanceInput = document.getElementById("advanceAmount")
const balanceInput = document.getElementById("balanceAmount")


advanceInput.addEventListener("input",()=>{

const total = parseFloat(totalInput.value) || 0
const advance = parseFloat(advanceInput.value) || 0

balanceInput.value = total - advance

})


document.getElementById("previewBtn").addEventListener("click",async()=>{

const data = {

client_name:document.getElementById("clientName").value,

phone:document.getElementById("clientPhone").value,

event_date:document.getElementById("startDate").value,

package:packageSelect.value,

total:totalInput.value,

advance:advanceInput.value,

balance:balanceInput.value,

status:"sent"

}

const result = await saveQuotation(data)

if(result){

window.location.href = `proposal.html?id=${result.id}`

}

})