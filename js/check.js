import { db, auth } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const applyI18n = () => globalThis.applyI18n?.();
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";

function getQueryParam(name) {
  const url = new URL(globalThis.location.href);
  return url.searchParams.get(name);
}

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

function setAuthUI(loggedIn) {
  document.getElementById("loginBtn").style.display = loggedIn ? "none" : "block";
  document.getElementById("logoutBtn").style.display = loggedIn ? "block" : "none";
}

async function getVenueNameForUser(uid) {
  const vs = await getDoc(doc(db, "venues", uid));
  if (!vs.exists()) return null;
  return vs.data()?.venueName || null;
}

async function getVenuePinForUser(uid) {
  const vs = await getDoc(doc(db, "venues", uid));
  if (!vs.exists()) return null;
  return vs.data()?.pin || null;
}

async function renderCheck(user) {
  const wrap = document.getElementById("checkWrap");
  const id = getQueryParam("id");
  const code = getQueryParam("code");

  if (!id || !code) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ Missing QR parameters</div></div>`;
    return;
  }

  const venueName = await getVenueNameForUser(user.uid);
  if (!venueName) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ No venue assigned to this account.</div></div>`;
    return;
  }

  const ref = doc(db, "bookings", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ Booking not found</div></div>`;
    return;
  }

  const b = snap.data();

  // تأكد الكود صحيح
  if (b.code !== code) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ Invalid code</div></div>`;
    return;
  }

  // تأكد هذا الحجز تابع لنفس المكان
  if (b.venue !== venueName) {
    wrap.innerHTML = `<div class="card"><div class="content">❌ Not your venue</div></div>`;
    return;
  }

  const used = !!b.used;
  const badgeHtml = `<div class="badge">${used ? "USED" : "VALID"}</div>`;

  const actionBtn = used
    ? ""
    : `<button id="markUsedBtn" class="btn primary" style="width:100%; margin-top:10px;">Mark as Used</button>`;

  wrap.innerHTML = `
    <div class="card">
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${pickTitleFromDoc(b)}</div>
          ${badgeHtml}
        </div>
        <div class="meta">${b.venue}</div>
        <div class="meta">${b.date} • ${b.time}</div>
        <div class="meta">Code: <b>${b.code}</b></div>
        <div class="meta">People: ${b.people} • Type: ${b.bookingType}</div>
        <div class="price" style="margin-top:8px;">
          Pay: ${moneyUSD(b.finalTotalUSD)} (${moneyIQDFromUSD(b.finalTotalUSD)})
        </div>
        ${actionBtn}
      </div>
    </div>
  `;

  if (!used) {
    document.getElementById("markUsedBtn").onclick = async () => {
      const entered = prompt("Enter venue PIN:");
      if (!entered) return;

      const pin = await getVenuePinForUser(user.uid);
      if (!pin || String(entered) !== String(pin)) {
        alert("Wrong PIN");
        return;
      }

      await updateDoc(ref, {
        used: true,
        usedAt: serverTimestamp(),
        usedBy: user.uid
      });

      location.reload();
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();

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
      document.getElementById("checkWrap").innerHTML =
        `<div class="card"><div class="content">Please login to verify QR.</div></div>`;
      return;
    }

    setAuthUI(true);
    await renderCheck(user);
  });
});
