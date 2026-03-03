document.addEventListener("DOMContentLoaded", function () {

  const previewBtn = document.getElementById("previewBtn");

  previewBtn.addEventListener("click", async function () {

    const clientName = document.getElementById("clientName").value;
    const phone = document.getElementById("clientPhone").value;
    const eventDate = document.getElementById("eventStartDate").value;
    const packageName = document.getElementById("packageSelect").value;
    const total = document.getElementById("totalAmount").value;
    const advance = document.getElementById("advanceAmount").value;
    const balance = document.getElementById("balanceAmount").value;

    if (!clientName || !phone) {
      alert("Fill required fields");
      return;
    }

    const quotationData = {
      client_name: clientName,
      phone: phone,
      event_date: eventDate,
      package: packageName,
      total: total,
      advance: advance,
      balance: balance,
      status: "sent"
    };

    const saved = await saveQuotation(quotationData);

    if (saved && saved.id) {
      window.location.href = `proposal.html?id=${saved.id}`;
    } else {
      alert("Error saving quotation");
    }

  });

});