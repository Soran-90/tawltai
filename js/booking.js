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

function renderQR(targetId, text) {
  const el = document.getElementById(targetId);
  if (!el || typeof QRCode === "undefined") return;

  el.innerHTML = ""; // clear
  new QRCode(el, {
    text,
    width: 180,
    height: 180,
  });
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

  // النص الذي يدخل داخل QR
  // مبدئيًا: كود + ID + معلومات مختصرة
  const qrText = `${location.origin}${location.pathname.replace("booking.html","check.html")}?id=${encodeURIComponent(b.id)}&code=${encodeURIComponent(b.code)}`;
    app: "tawltai",
    bookingId: b.id,
    code: b.code,
    eventId: b.eventId,
    venue: b.venue,
    date: b.date,
    time: b.time,
    people: b.people,
    totalUSD: b.finalTotalUSD,
  });

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

            <div style="display:flex; gap:14px; align-items:center; margin-top:12px; flex-wrap:wrap;">
              <div id="qrBox" style="background:#fff; padding:10px; border-radius:12px;"></div>
              <div class="meta" style="max-width:260px;">
                Scan the QR at entry.<br/>
                If scan fails, use the code above.
              </div>
            </div>
          </div>
        </div>

        <div class="meta" style="margin-top:12px;">Type: ${b.bookingType} • People: ${b.people}</div>

        <div class="price" style="margin-top:10px;">
          Pay: ${moneyUSD(b.finalTotalUSD)} (${moneyIQDFromUSD(b.finalTotalUSD)})
        </div>
      </div>
    </div>
  `;

  renderQR("qrBox", qrText);
});
