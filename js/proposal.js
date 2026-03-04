document.addEventListener("DOMContentLoaded", async function () {

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  if (!id) return;

  const data = await getQuotationById(id);
  if (!data) return;

  /* -----------------------
     BASIC INFO
  ----------------------- */

  document.getElementById("clientName").innerText = data.client_name;
  document.getElementById("eventDate").innerText = data.event_date;

  document.getElementById("total").innerText = data.total;
  document.getElementById("advance").innerText = data.advance;
  document.getElementById("balance").innerText = data.balance;

  /* -----------------------
     STATUS BADGE
  ----------------------- */

  const statusArea = document.getElementById("statusArea");

  let badgeClass = "sent";
  if (data.status === "accepted") badgeClass = "accepted";
  if (data.status === "confirmed") badgeClass = "confirmed";

  statusArea.innerHTML = `
    <div class="status-badge ${badgeClass}">
      ${data.status.toUpperCase()}
    </div>
  `;

  /* -----------------------
     SERVICES TABLE
  ----------------------- */

  const services = JSON.parse(localStorage.getItem("selectedServices")) || [];
  const servicesTable = document.getElementById("servicesTable");

  if (services.length > 0) {

    let html = `
      <tr>
        <th>Service</th>
        <th>Team</th>
        <th>Days</th>
      </tr>
    `;

    services.forEach(service => {

      html += `
        <tr>
          <td>${service.name}</td>
          <td>${service.qty}</td>
          <td>${service.days}</td>
        </tr>
      `;

    });

    servicesTable.innerHTML = html;
  }

  /* -----------------------
     DELIVERABLES LIST
  ----------------------- */

  const deliverables = JSON.parse(localStorage.getItem("selectedDeliverables")) || [];
  const deliverablesList = document.getElementById("deliverablesList");

  if (deliverables.length > 0) {

    let html = "";

    deliverables.forEach(item => {
      html += `<li>${item}</li>`;
    });

    deliverablesList.innerHTML = html;

  }

  /* -----------------------
     ACTION BUTTON
  ----------------------- */

  const actionArea = document.getElementById("actionArea");

  if (data.status !== "confirmed") {

    actionArea.innerHTML = `
      <button id="confirmBtn">Confirm Booking</button>
    `;

    document.getElementById("confirmBtn").addEventListener("click", async () => {

      if (parseFloat(data.advance) <= 0) {
        alert("Advance payment required before confirmation.");
        return;
      }

      const { error } = await supabase
        .from("quotations")
        .update({ status: "confirmed" })
        .eq("id", id);

      if (!error) {
        location.reload();
      }

    });

  }

});