import { db } from "../shared/js/firebase.js";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ensureAuth } from "../shared/js/auth.js";

const applyI18n = (...a) => globalThis.applyI18n?.(...a);
const t = (k) => globalThis.t ? globalThis.t(k) : k;
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";
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

  const localList = JSON.parse(localStorage.getItem("bookings") || "[]");

  function pickTitle(b) {
    if (b.title) return b.title;
    const lang = getLang();
    if (lang === "ar") return b.title_ar || b.title_en || b.title_ku || "Event";
    if (lang === "ku") return b.title_ku || b.title_en || b.title_ar || "Event";
    return b.title_en || b.title_ar || b.title_ku || "Event";
  }

  async function loadBookings() {
    try {
      const user = await ensureAuth();
      const bookingsRef = collection(db, "bookings");
      const bookingsQuery = query(
        bookingsRef,
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(bookingsQuery);
      return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (e) {
      console.warn("Failed to load bookings from Firestore:", e);
      return localList;
    }
  }

  function renderBookings(list) {
    if (!list.length) {
      root.innerHTML = `<div class="card"><div class="content">${t("no_bookings")}</div></div>`;
      return;
    }

    root.innerHTML = list.map(b => `
      <a class="card" href="booking.html?id=${encodeURIComponent(b.id)}" style="text-decoration:none; color:inherit;">
        <div class="content" style="width:100%;">
          <div class="row">
            <div class="title">${pickTitle(b)}</div>
            <div class="badge">${t("status")}: ${b.status || "-"}</div>
          </div>

          <div class="meta">${b.venue || "-"}</div>
          <div class="meta">${b.date || "-"} • ${b.time || "-"}</div>

          <div class="meta">
            ${t("type")}: ${typeLabel(b.bookingType)} • ${t("people")}: ${b.people || 0}
          </div>

          <div class="price" style="margin-top:8px;">
            ${t("pay")}: ${formatMoneyUSD(b.finalTotalUSD)} (${formatMoneyIQDFromUSD(b.finalTotalUSD)})
          </div>
        </div>
      </a>
    `).join("");
  }

  loadBookings().then(renderBookings);
});
