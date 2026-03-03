const bookingList = document.getElementById("bookingList");
const quotations = JSON.parse(localStorage.getItem("quotations")) || [];

const confirmed = quotations.filter(q =>
  q.status === "Advance Received (Booking Confirmed)"
);

if(confirmed.length === 0){
  bookingList.innerHTML = "<p>No confirmed bookings yet.</p>";
} else {
  confirmed.forEach(b => {
    bookingList.innerHTML += `
      <div class="bg-slate-800 p-4 rounded-xl">
        <p><strong>${b.clientName}</strong></p>
        <p>${b.startDate} to ${b.endDate}</p>
        <p>Total: ₹${b.total}</p>
        <p>Advance: ₹${b.advance}</p>
        <p>Balance: ₹${b.balance}</p>
        <p>Status: ${b.status}</p>
      </div>
    `;
  });
}