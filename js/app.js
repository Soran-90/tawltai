function pickTitle(ev) {
  const lang = getLang();
  if (lang === "ar") return ev.title_ar;
  if (lang === "ku") return ev.title_ku;
  return ev.title_en;
}

function renderEvents(list) {
  const root = document.getElementById("eventsList");
  if (!root) return;

  root.innerHTML = list.map(ev => `
    <div class="card">
      <div class="thumb" style="background-image:url('${ev.img}')"></div>
      <div class="content">
        <div class="row">
          <div class="title">${pickTitle(ev)}</div>
          ${ev.discountPercent ? `<div class="badge">${t("discount_badge")} ${ev.discountPercent}%</div>` : ""}
        </div>
        <div class="meta">${ev.venue} • ${ev.city}</div>
        <div class="meta">${ev.date} • ${ev.time}</div>
        <div class="price">${t("price_from")} $${ev.priceFromUSD}</div>

        <div class="actions">
          <a class="btn" href="event.html?id=${encodeURIComponent(ev.id)}">${t("view_details")}</a>
          <a class="btn primary" href="event.html?id=${encodeURIComponent(ev.id)}#book">${t("book_now")}</a>
        </div>
      </div>
    </div>
  `).join("");
}

function setupSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = (input.value || "").toLowerCase().trim();
    const filtered = window.MOCK_EVENTS.filter(ev =>
      ev.venue.toLowerCase().includes(q) ||
      pickTitle(ev).toLowerCase().includes(q)
    );
    renderEvents(filtered);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
  renderEvents(window.MOCK_EVENTS);
  setupSearch();
});
