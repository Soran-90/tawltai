function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function usdToIqd(usd) {
  const rate = (window.APP_SETTINGS && window.APP_SETTINGS.usdToIqd) ? window.APP_SETTINGS.usdToIqd : 1310;
  return Math.round(Number(usd || 0) * rate);
}

function moneyUSD(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function moneyIQDFromUSD(usd) {
  return `${usdToIqd(usd).toLocaleString("en-US")} IQD`;
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();

  const bookingId = getQueryParam("id");
  const wrap = document.getElementById("bookingWrap");
  const list = JSON.parse(localStorage.getItem("bookings") || "[]");
  const b = list.find(x => x.id === bookingId);

  if (!b) {
    wrap.innerHTML = `<div class="card"><div class="content">Booking not found.</div></div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${b.title}</div>
          <div class="badge">${b.status}</div>
        </div>

        <div class="meta">${b.venue}</div>
        <div class="meta">${b.date} • ${b.time}</div>

        <div class="card" style="margin-top:12px;">
          <div class="content" style="width:100%;">
            <div class="meta" style="opacity:1; font-weight:700;">Booking Code</div>
            <div style="font-size:28px; font-weight:800; letter-spacing:2px; margin-top:6px;">${b.code}</div>
            <div class="meta" style="margin-top:6px;">Show this code at entry</div>
          </div>
        </div>

        <div class="meta" style="margin-top:12px;">Type: ${b.bookingType} • People: ${b.people}</div>

        <div class="price" style="margin-top:10px;">
          Pay: ${moneyUSD(b.finalTotalUSD)} (${moneyIQDFromUSD(b.finalTotalUSD)})
        </div>
      </div>
    </div>
  `;
});
