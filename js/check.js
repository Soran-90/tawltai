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

/**
 * === Firebase-ready layer ===
 * لاحقًا نستبدل هذي الدوال بـ Firestore:
 * - loadBookingFromDB(id)
 * - markUsedInDB(id)
 *
 * حاليًا نستخدم localStorage كـ demo.
 */
function loadBookingLocal(id) {
  const list = JSON.parse(localStorage.getItem("bookings") || "[]");
  return list.find(x => x.id === id) || null;
}

function getUsedFlagLocal(id) {
  const usedMap = JSON.parse(localStorage.getItem("usedBookings") || "{}");
  return !!usedMap[id];
}

function setUsedFlagLocal(id, val) {
  const usedMap = JSON.parse(localStorage.getItem("usedBookings") || "{}");
  usedMap[id] = !!val;
  localStorage.setItem("usedBookings", JSON.stringify(usedMap));
}

function renderStatusCard({ ok, title, message }) {
  const wrap = document.getElementById("checkWrap");
  wrap.innerHTML = `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="title" style="font-size:22px; margin-bottom:8px;">
          ${ok ? "✅ VALID" : "❌ USED / INVALID"}
        </div>
        <div class="meta" style="opacity:1; font-weight:700;">${title}</div>
        <div class="meta" style="margin-top:6px;">${message}</div>
      </div>
    </div>
  `;
}

function renderBookingCard(b, used) {
  const wrap = document.getElementById("checkWrap");

  const statusBadge = used ? `<div class="badge">USED</div>` : `<div class="badge">VALID</div>`;
  const actionBtn = used
    ? ""
    : `<button id="markUsedBtn" class="btn primary" style="width:100%; margin-top:10px;">Mark as Used</button>`;

  wrap.innerHTML = `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${b.title}</div>
          ${statusBadge}
        </div>
        <div class="meta">${b.venue}</div>
        <div class="meta">${b.date} • ${b.time}</div>
        <div class="meta">Code: <b>${b.code}</b></div>
        <div class="meta">Type: ${b.bookingType} • People: ${b.people}</div>
        <div class="price" style="margin-top:8px;">
          Pay: ${moneyUSD(b.finalTotalUSD)} (${moneyIQDFromUSD(b.finalTotalUSD)})
        </div>
        ${actionBtn}
      </div>
    </div>
  `;

  if (!used) {
    document.getElementById("markUsedBtn").addEventListener("click", () => {
      // لاحقًا هنا: markUsedInDB(b.id)
      setUsedFlagLocal(b.id, true);
      location.reload();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();

  const id = getQueryParam("id");
  const code = getQueryParam("code");

  if (!id || !code) {
    renderStatusCard({
      ok: false,
      title: "Missing parameters",
      message: "QR link is incomplete.",
    });
    return;
  }

  // لاحقًا: b = await loadBookingFromDB(id)
  const b = loadBookingLocal(id);

  if (!b) {
    renderStatusCard({
      ok: false,
      title: "Booking not found",
      message: "This booking does not exist on this device. (Will be Firestore later)",
    });
    return;
  }

  if (b.code !== code) {
    renderStatusCard({
      ok: false,
      title: "Code mismatch",
      message: "Invalid QR code.",
    });
    return;
  }

  const used = getUsedFlagLocal(id);
  renderBookingCard(b, used);
});
