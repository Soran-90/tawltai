import { db, auth } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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

let unsubscribe = null;
let venueName = null;

function renderBookings(rows) {
  const root = document.getElementById("venueList");

  if (!rows.length) {
    root.innerHTML = `<div class="card"><div class="content">No bookings for <b>${venueName}</b></div></div>`;
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
        <div class="meta">People: ${data.people} • Type: ${data.bookingType}</div>
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

async function loadVenueForUser(uid) {
  const snap = await getDoc(doc(db, "venues", uid));
  if (!snap.exists()) return null;
  return snap.data()?.venueName || null;
}

function subscribeBookings() {
  if (!venueName) return;

  if (unsubscribe) unsubscribe();

  const q = query(collection(db, "bookings"), where("venue", "==", venueName));
  unsubscribe = onSnapshot(q, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    renderBookings(rows);
  });
}

function setAuthUI(loggedIn) {
  document.getElementById("loginBtn").style.display = loggedIn ? "none" : "block";
  document.getElementById("logoutBtn").style.display = loggedIn ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  globalThis.applyI18n?.();

  const msg = document.getElementById("authMsg");

  document.getElementById("loginBtn").onclick = async () => {
    msg.textContent = "";
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      msg.textContent = e?.message || e;
    }
  };

  document.getElementById("logoutBtn").onclick = async () => {
    await signOut(auth);
  };

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setAuthUI(false);
      venueName = null;
      document.getElementById("venueList").innerHTML = `<div class="card"><div class="content">Please login.</div></div>`;
      if (unsubscribe) unsubscribe();
      return;
    }

    setAuthUI(true);

    venueName = await loadVenueForUser(user.uid);
    if (!venueName) {
      document.getElementById("venueList").innerHTML =
        `<div class="card"><div class="content">No venue assigned to this account.</div></div>`;
      return;
    }

    // نخفي اختيار venue اليدوي (صار مرتبط بالحساب)
    const select = document.getElementById("venueSelect");
    if (select) {
      select.value = venueName;
      select.disabled = true;
    }

    subscribeBookings();
  });
});
