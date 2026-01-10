document.addEventListener("DOMContentLoaded", () => {
  applyI18n();

  const root = document.getElementById("bookingsList");
  const list = JSON.parse(localStorage.getItem("bookings") || "[]");

  if (!list.length) {
    root.innerHTML = `<div class="card"><div class="content">No bookings yet.</div></div>`;
    return;
  }

  root.innerHTML = list.map(b => `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${b.title}</div>
          <div class="badge">${b.status}</div>
        </div>
        <div class="meta">${b.venue}</div>
        <div class="meta">${b.date} • ${b.time}</div>
        <div class="meta">Type: ${b.bookingType} • People: ${b.people}</div>
        <div class="price" style="margin-top:8px;">Pay: $${b.finalTotalUSD}</div>
      </div>
    </div>
  `).join("");
});
