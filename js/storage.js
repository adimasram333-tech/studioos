// Initialize storage
if (!localStorage.getItem("bookings")) {
  localStorage.setItem("bookings", JSON.stringify([]));
}

if (!localStorage.getItem("invoices")) {
  localStorage.setItem("invoices", JSON.stringify([]));
}

// Load dashboard data
function loadDashboard() {
  const bookings = JSON.parse(localStorage.getItem("bookings")) || [];
  const invoices = JSON.parse(localStorage.getItem("invoices")) || [];

  const totalBookingsEl = document.getElementById("totalBookings");
  const pendingPaymentsEl = document.getElementById("pendingPayments");

  if (totalBookingsEl) {
    totalBookingsEl.innerText = bookings.length;
  }

  if (pendingPaymentsEl) {
    let pending = invoices
      .filter(inv => inv.status === "pending")
      .reduce((sum, inv) => sum + (inv.balance || 0), 0);

    pendingPaymentsEl.innerText = "₹" + pending;
  }
}

loadDashboard();