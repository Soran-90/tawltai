console.log("Rate:", window.APP_SETTINGS?.usdToIqd);
function formatMoneyUSD(x) {
  const n = Number(x || 0);
  return `$${n.toFixed(2)}`;
}

function formatMoneyIQDFromUSD(usd) {
  const rate = (window.APP_SETTINGS && window.APP_SETTINGS.usdToIqd) ? window.APP_SETTINGS.usdToIqd : 1310;
  const iqd = Math.round(Number(usd || 0) * rate);
  return `${iqd.toLocaleString("en-US")} IQD`;
}

function typeLabel(typeKey) {
  if (typeKey === "entry") return t("entry");
  if (typeKey === "table") return t("table");
  if (typeKey === "vip") return t("vip");
  return typeKey;
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();

  const root = document.getElementById("bookingsList");
  if (!root) return;

  const list = JSON.parse(localStorage.getItem("bookings") || "[]");

  if (!list.length) {
    root.innerHTML = `<div class="card"><div class="content">${t("no_bookings")}</div></div>`;
    return;
  }

  root.innerHTML = list.map(b => `
    <a class="card" href="booking.html?id=${encodeURIComponent(b.id)}" style="text-decoration:none; color:inherit;">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${b.title}</div>
          <div class="badge">${t("status")}: ${b.status}</div>
        </div>

        <div class="meta">${b.venue}</div>
        <div class="meta">${b.date} • ${b.time}</div>

        <div class="meta">
          ${t("type")}: ${typeLabel(b.bookingType)} • ${t("people")}: ${b.people}
        </div>

        <div class="price" style="margin-top:8px;">
          ${t("pay")}: ${formatMoneyUSD(b.finalTotalUSD)} (${formatMoneyIQDFromUSD(b.finalTotalUSD)})
        </div>
      </div>
    </a>
  `).join("");
});
