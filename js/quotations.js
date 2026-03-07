function loadQuotations() {

  const listContainer = document.getElementById("quotationList");

  let quotations = JSON.parse(localStorage.getItem("quotations")) || [];

  if (quotations.length === 0) {
    listContainer.innerHTML =
      "<p class='text-gray-400'>No quotations found.</p>";
    return;
  }

  listContainer.innerHTML = "";

  quotations
    .slice()
    .reverse()
    .forEach((q) => {

      const statusColor =
        q.status === "Draft"
          ? "bg-gray-500"
          : q.status === "Sent"
          ? "bg-yellow-500"
          : q.status.includes("Confirmed")
          ? "bg-green-600"
          : "bg-red-500";

      const card = document.createElement("div");

      card.className = "glass p-5 rounded-2xl";

      card.innerHTML = `
      <div class="flex justify-between items-center">

        <div>
          <h2 class="text-lg font-semibold">${q.clientName}</h2>
          <p class="text-sm text-gray-400">
            ${formatDate(q.startDate)} to ${formatDate(q.endDate)}
          </p>
        </div>

        <span class="px-3 py-1 text-sm rounded-full ${statusColor}">
          ${q.status}
        </span>

      </div>

      <div class="mt-3 text-sm">

        <p>Total: ₹${q.total}</p>
        <p>Advance: ₹${q.advance}</p>
        <p>Balance: ₹${q.balance}</p>

      </div>

      <div class="mt-4 flex gap-2 flex-wrap">

        <button onclick="markSent(${q.id})"
        class="bg-yellow-600 px-3 py-1 rounded-lg text-sm">
        Mark Sent
        </button>

        <button onclick="markConfirmed(${q.id})"
        class="bg-green-600 px-3 py-1 rounded-lg text-sm">
        Confirm
        </button>

        <button onclick="deleteQuotation(${q.id})"
        class="bg-red-600 px-3 py-1 rounded-lg text-sm">
        Delete
        </button>

      </div>
    `;

      listContainer.appendChild(card);
    });
}

function formatDate(dateString) {

  if (!dateString) return "-";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function markSent(id) {

  updateStatus(id, "Sent");
}

function markConfirmed(id) {

  updateStatus(id, "Advance Received (Booking Confirmed)");
}

function deleteQuotation(id) {

  let quotations = JSON.parse(localStorage.getItem("quotations")) || [];

  quotations = quotations.filter((q) => q.id !== id);

  localStorage.setItem("quotations", JSON.stringify(quotations));

  loadQuotations();
}

function updateStatus(id, newStatus) {

  let quotations = JSON.parse(localStorage.getItem("quotations")) || [];

  quotations = quotations.map((q) => {

    if (q.id === id) {
      q.status = newStatus;
    }

    return q;
  });

  localStorage.setItem("quotations", JSON.stringify(quotations));

  loadQuotations();
}

loadQuotations();