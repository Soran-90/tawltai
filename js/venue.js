import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

alert("venue.js loaded"); // تأكيد إن الملف انقرا

const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";

function usdToIqd(usd) {
  const rate = (globalThis.APP_SETTINGS && globalThis.APP_SETTINGS.usdToIqd) ? globalThis.APP_SETTINGS.usdToIqd : 1310;
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

let currentFilter = "all";

function isToday(yyyy_mm_dd) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === yyyy_mm_dd;
}

function setActiveFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".chip[data-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === filter);
  });
  renderFromCache();
}

let cache = []; // نخزن آخر نتائج من Firestore

function renderFromCache() {
  const venue = document.getElementById("venueSelect")?.value || "";
  const root = document.getElementById("venueList");
  if (!root) return;

  let rows = cache.slice();

  // فلترة محلية حسب venue
  rows = rows.filter(r => String(r.data.venue || "") === String(venue));

  // فلترة حسب زر الفلاتر
  if (currentFilter === "today") rows = rows.filter(r => isToday(r.data.date));
  else if (currentFilter === "used") rows = rows.filter(r => !!r.data.used);
  else if (currentFilter === "valid") rows = rows.filter(r => !r.data.used);

  // إذا بعد ماكو نتائج، اعرض رسالة واضحة + اعرض عدد الحجوزات الكلي للتشخيص
  if (!rows.length) {
    root.innerHTML = `
      <div class="card"><div class="content">
        No bookings for: <b>${venue}</b><br/>
        Total bookings in Firestore: <b>${cache.length}</b><br/>
        (إذا total = 0 معناها ماكو حجوزات داخل Firestore أو القراءة ممنوعة)
      </div></div>
    `;
    return;
  }

  root.innerHTML = rows.map(({ id, data }) => {
    const title = pickTitleFromDoc(data);
    const used = !!data.used;
    const badge = used ? "USED" : "VALID";
    const actionBtn = used ? "" : `
      <button class="btn primary" data-markused="${id}" style="margin-top:10px; width:100%;">Mark as Used</button>
    `;

    return `
      <div class="card">
        <div class="content" style="width:100%;">
          <div class="row">
            <div class="title">${title}</div>
            <div class="badge">${badge}</div>
          </div>

          <div class="meta"><b>Venue:</b> ${data.venue}</div>
          <div class="meta"><b>Date:</b> ${data.date} • ${data.time}</div>
          <div class="meta"><b>Code:</b> ${data.code} • <b>People:</b> ${data.people} • <b>Type:</b> ${data.bookingType}</div>

          <div class="price" style="margin-top:8px;">
            Pay: ${moneyUSD(data.finalTotalUSD)} (${moneyIQDFromUSD(data.finalTotalUSD)})
          </div>

          ${actionBtn}
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-markused]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const bookingId = btn.getAttribute("data-markused");
      btn.disabled = true;
      await updateDoc(doc(db, "bookings", bookingId), { used: true, usedAt: serverTimestamp() });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  globalThis.applyI18n?.();

  const root = document.getElementById("venueList");
  if (root) root.innerHTML = `<div class="card"><div class="content">Loading from Firestore...</div></div>`;

  document.getElementById("venueSelect")?.addEventListener("change", renderFromCache);
  document.querySelectorAll(".chip[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => setActiveFilter(btn.getAttribute("data-filter")));
  });

  // أهم جزء: قراءة كل الحجوزات بدون where/orderBy (ما يحتاج index)
  onSnapshot(
    collection(db, "bookings"),
    (snap) => {
      cache = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      renderFromCache();
    },
    (err) => alert("Firestore read error: " + (err?.message || err))
  );
});
