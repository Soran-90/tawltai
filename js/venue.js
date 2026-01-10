import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

// date string format in your mock: "2026-01-15"
function isToday(yyyy_mm_dd) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === yyyy_mm_dd;
}

let unsubscribe = null;
let currentFilter = "all";

function setActiveFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".chip[data-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === filter);
  });
  load();
}

function renderList(docs) {
  const root = document.getElementById("venueList");
  if (!docs.length) {
    root.innerHTML = `<div class="card"><div class="content">No bookings.</div></div>`;
    return;
  }

  root.innerHTML = docs.map(({ id, data }) => {
    const title = pickTitleFromDoc(data);
    const used = !!data.used;

    const badge = used ? "USED" : "VALID";
    const badgeHtml = `<div class="badge">${badge}</div>`;

    const actionBtn = used
      ? ""
      : `<button class="btn primary" data-markused="${id}" style="margin-top:10px; width:100%;">Mark as Used</button>`;

    return `
      <div class="card">
        <div class="content" style="width:100%;">
          <div class="row">
            <div class="title">${title}</div>
            ${badgeHtml}
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

  // attach actions
  document.querySelectorAll("[data-markused]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const bookingId = btn.getAttribute("data-markused");
      btn.disabled = true;
      await updateDoc(doc(db, "bookings", bookingId), { used: true, usedAt: serverTimestamp() });
      // snapshot will refresh automatically
    });
  });
}

ffunction load() {
  const venue = document.getElementById("venueSelect").value;

  if (unsubscribe) unsubscribe();

  const baseRef = collection(db, "bookings");

  // (A) Query مع ترتيب — قد يحتاج Index
  const q1 = query(
    baseRef,
    where("venue", "==", venue),
    orderBy("date", "desc"),
    limit(50)
  );

  unsubscribe = onSnapshot(
    q1,
    (snap) => {
      let rows = snap.docs.map(d => ({ id: d.id, data: d.data() }));

      if (currentFilter === "today") rows = rows.filter(r => isToday(r.data.date));
      else if (currentFilter === "used") rows = rows.filter(r => !!r.data.used);
      else if (currentFilter === "valid") rows = rows.filter(r => !r.data.used);

      renderList(rows);
    },
    (err) => {
      // إذا كان يحتاج index، نستخدم fallback بدون orderBy
      alert("Firestore error: " + (err?.message || err));

      const q2 = query(
        baseRef,
        where("venue", "==", venue),
        limit(50)
      );

      if (unsubscribe) unsubscribe();
      unsubscribe = onSnapshot(
        q2,
        (snap2) => {
          let rows = snap2.docs.map(d => ({ id: d.id, data: d.data() }));

          // ترتيب محلي بدل orderBy
          rows.sort((a, b) => String(b.data.date || "").localeCompare(String(a.data.date || "")));

          if (currentFilter === "today") rows = rows.filter(r => isToday(r.data.date));
          else if (currentFilter === "used") rows = rows.filter(r => !!r.data.used);
          else if (currentFilter === "valid") rows = rows.filter(r => !r.data.used);

          renderList(rows);
        },
        (err2) => alert("Firestore fallback error: " + (err2?.message || err2))
      );
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  globalThis.applyI18n?.();

  document.getElementById("venueSelect").addEventListener("change", load);
  document.querySelectorAll(".chip[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => setActiveFilter(btn.getAttribute("data-filter")));
  });

  load();
});
