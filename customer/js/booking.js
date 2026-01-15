import { db } from "../../shared/js/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ensureAuth } from "../../shared/js/auth.js";

const applyI18n = (...a) => globalThis.applyI18n?.(...a);
const t = (k) => globalThis.t ? globalThis.t(k) : k;
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";

function getQueryParam(name) {
  const url = new URL(globalThis.location.href);
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

  async function loadBooking() {
    try {
      await ensureAuth();
      const snap = await getDoc(doc(db, "bookings", bookingId));
      if (!snap.exists()) return null;
      const data = snap.data();
      return data;
    } catch (e) {
      console.warn("Failed to load booking from Firestore:", e);
      return null;
    }
  }

  function pickTitle(b) {
    if (b.title) return b.title;
    const lang = getLang();
    if (lang === "ar") return b.title_ar || b.title_en || b.title_ku || "Event";
    if (lang === "ku") return b.title_ku || b.title_en || b.title_ar || "Event";
    return b.title_en || b.title_ar || b.title_ku || "Event";
  }

  function resolveBookingSource(b) {
    if (b) return b;
    return list.find(x => x.id === bookingId) || null;
  }

  loadBooking().then((fetched) => {
    const b = resolveBookingSource(fetched);
    if (!b) {
      wrap.innerHTML = `<div class="card"><div class="content">Booking not found.</div></div>`;
      return;
    }

    const qrUrl = new URL("../venue/check.html", globalThis.location.href);
    qrUrl.searchParams.set("id", b.id);
    qrUrl.searchParams.set("code", b.code);

    wrap.innerHTML = `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${pickTitle(b)}</div>
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

        <div class="meta" style="margin-top:12px;">${t("type")}: ${b.bookingType} • ${t("people")}: ${b.people}</div>

        <div class="price" style="margin-top:10px;">
          ${t("pay")}: ${moneyUSD(b.finalTotalUSD)} (${moneyIQDFromUSD(b.finalTotalUSD)})
        </div>
      </div>
    </div>
  `;

    renderQR("qrBox", qrUrl.toString());
  });
});
