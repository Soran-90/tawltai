import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function usdToIqd(usd) {
  const rate = (window.APP_SETTINGS && window.APP_SETTINGS.usdToIqd) ? window.APP_SETTINGS.usdToIqd : 1310;
  return Math.round(Number(usd || 0) * rate);
}
function moneyUSD(n) { return `$${Number(n || 0).toFixed(2)}`; }
function moneyIQDFromUSD(usd) { return `${usdToIqd(usd).toLocaleString("en-US")} IQD`; }

function pickTitleFromDoc(d) {
  const lang = getLang();
  if (lang === "ar") return d.title_ar || d.title_en || d.title_ku || "Event";
  if (lang === "ku") return d.title_ku || d.title_en || d.title_ar || "Event";
  return d.title_en || d.title_ar || d.title_ku || "Event";
}

document.addEventListener("DOMContentLoaded", async () => {
  applyI18n();

  const wrap = document.getElementById("checkWrap");
  const id = getQueryParam("id");
  const code = getQueryParam("code");

  if (!id || !code) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ Missing QR parameters</div></div>`;
    return;
  }

  const ref = doc(db, "bookings", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ Booking not found</div></div>`;
    return;
  }

  const b = snap.data();

  if (b.code !== code) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ Invalid code</div></div>`;
    return;
  }

  const used = !!b.used;

  const statusBadge = used ? `<div class="badge">USED</div>` : `<div class="badge">VALID</div>`;
  const actionBtn = used ? "" : `<button id="markUsedBtn" class="btn primary" style="width:100%; margin-top:10px;">Mark as Used</button>`;

  wrap.innerHTML = `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${pickTitleFromDoc(b)}</div>
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
    document.getElementById("markUsedBtn").addEventListener("click", async () => {
      await updateDoc(ref, {
        used: true,
        usedAt: serverTimestamp(),
      });
      location.reload();
    });
  }
});
