import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

alert("venue.js loaded");

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
let cache = [];

function isToday(dateStr) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === dateStr;
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll(".chip[data-filter]").forEach(b =>
    b.classList.toggle("active", b.dataset.filter === f)
  );
  render();
}

function render() {
  const venue = document.getElementById("venueSelect")?.value || "";
  const root = document.getElementById("venueList");

  let rows = cache.filter(r => r.data.venue === venue);

  if (currentFilter === "today") rows = rows.filter(r => isToday(r.data.date));
  if (currentFilter === "used") rows = rows.filter(r => r.data.used);
  if (currentFilter === "valid") rows = rows.filter(r => !r.data.used);

  if (!rows.length) {
    root.innerHTML = `
      <div class="card">
        <div class="content">
          No bookings for <b>${venue}</b><br/>
          Total in Firestore: <b>${cache.length}</b>
        </div>
      </div>`;
    return;
  }

  root.innerHTML = rows.map(({ id, data }) => `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${pickTitleFromDoc(data)}</div>
          <div class="badge">${data.used ? "USED" : "VALID"}</div>
        </div>
        <div class="meta">${data.date} • ${data.time}</div>
        <div class="meta">Code: <b>${data.code}</b></div>
        <div class="meta">People: ${data.people}</div>
        <div class="price">
          ${moneyUSD(data.finalTotalUSD)} (${moneyIQDFromUSD(data.finalTotalUSD)})
        </div>
        ${data.used ? "" : `<button class="btn primary" data-id="${id}">Mark as Used</button>`}
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-id]").forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, "bookings", btn.dataset.id), {
        used: true,
        usedAt: serverTimestamp()
      });
    };
  });
}

document.addEventListener("DOMContentLoaded", () => {
  globalThis.applyI18n?.();

  document.getElementById("venueSelect")?.addEventListener("change", render);
  document.querySelectorAll(".chip[data-filter]").forEach(btn =>
    btn.addEventListener("click", () => setFilter(btn.dataset.filter))
  );

  onSnapshot(collection(db, "bookings"), snap => {
    cache = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    render();
  });
});
