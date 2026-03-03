// ===============================
// StudioOS Proposal Engine v2
// A4 Structured Web Proposal
// ===============================

// ---- GET ID FROM URL ----
const params = new URLSearchParams(window.location.search);
const id = parseInt(params.get("id"));

// ---- LOAD QUOTATION ----
const quotation = DataService.getQuotationById(id);

if (!quotation) {
    document.querySelector(".page").innerHTML =
        "<h2 style='text-align:center;'>Proposal not found.</h2>";
} else {

    // ===== BASIC INFO =====
    document.getElementById("clientName").innerText = quotation.client;
    document.getElementById("eventDate").innerText =
        formatDate(quotation.start) + " to " + formatDate(quotation.end);

    renderStatus();
    renderServices();
    renderDeliverables();
    renderActionArea();
}


// =====================================
// STATUS BADGE
// =====================================
function renderStatus() {

    const statusArea = document.getElementById("statusArea");

    let badgeClass = "sent";
    if (quotation.status === "Accepted") badgeClass = "accepted";
    if (quotation.status === "Confirmed") badgeClass = "confirmed";

    statusArea.innerHTML = `
        <div class="status-badge ${badgeClass}">
            Status: ${quotation.status}
        </div>
    `;
}


// =====================================
// SERVICES TABLE RENDER
// =====================================
function renderServices() {

    const table = document.getElementById("servicesTable");

    // Expecting quotation.services as text lines
    const lines = quotation.services.split("\n").filter(l => l.trim() !== "");

    let html = `
        <tr>
            <th>Service</th>
            <th>Details</th>
        </tr>
    `;

    lines.forEach(line => {
        html += `
            <tr>
                <td>${line}</td>
                <td>-</td>
            </tr>
        `;
    });

    table.innerHTML = html;
}


// =====================================
// DELIVERABLES RENDER
// =====================================
function renderDeliverables() {

    const list = document.getElementById("deliverablesList");

    list.innerHTML = quotation.deliverables
        .map(item => `<li style="margin-bottom:8px;">✓ ${item}</li>`)
        .join("");

    // Investment values
    document.getElementById("total").innerText = quotation.total;
    document.getElementById("advance").innerText = quotation.advance;
    document.getElementById("balance").innerText = quotation.balance;
}


// =====================================
// ACTION AREA (ACCEPT LOGIC)
// =====================================
function renderActionArea() {

    const actionArea = document.getElementById("actionArea");

    if (quotation.status === "Sent") {
        actionArea.innerHTML = `
            <button onclick="acceptProposal()">
                Accept Proposal
            </button>
        `;
    }

    if (quotation.status === "Accepted") {
        actionArea.innerHTML = `
            <p style="margin-top:20px; color:#a67c00;">
                Proposal accepted. Waiting for advance payment to confirm booking.
            </p>
        `;
    }

    if (quotation.status === "Confirmed") {
        actionArea.innerHTML = `
            <p style="margin-top:20px; color:green;">
                Booking Confirmed. Thank you!
            </p>
        `;
    }
}


// =====================================
// ACCEPT FUNCTION
// =====================================
function acceptProposal() {
    DataService.updateQuotation(id, { status: "Accepted" });
    location.reload();
}


// =====================================
// DATE FORMATTER
// =====================================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}