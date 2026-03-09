import { db } from "../shared/js/firebase.js";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ensureAuth, isAnonymous } from "../shared/js/auth.js";

const applyI18n = () => globalThis.applyI18n?.();
const t = (k) => globalThis.t ? globalThis.t(k) : k;
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";

function formatMoneyUSD(x) { return "$" + Number(x || 0).toFixed(2); }
function formatMoneyIQDFromUSD(usd) {
  var rate = (window.APP_SETTINGS && window.APP_SETTINGS.usdToIqd) ? window.APP_SETTINGS.usdToIqd : 1310;
  var iqd = Math.round(Number(usd || 0) * rate);
  return iqd.toLocaleString("en-US") + " IQD";
}

function typeLabel(typeKey) {
  if (typeKey === "entry") return t("entry");
  if (typeKey === "table") return t("table");
  if (typeKey === "vip") return "VIP";
  return typeKey;
}

function pickTitle(b) {
  if (b.title) return b.title;
  var lang = getLang();
  if (lang === "ar") return b.title_ar || b.title_en || b.title_ku || "Event";
  if (lang === "ku") return b.title_ku || b.title_en || b.title_ar || "Event";
  return b.title_en || b.title_ar || b.title_ku || "Event";
}

document.addEventListener("DOMContentLoaded", async function() {
  applyI18n();

  var root = document.getElementById("bookingsList");
  var loginPrompt = document.getElementById("loginPrompt");
  if (!root) return;

  var localList = JSON.parse(localStorage.getItem("bookings") || "[]");

  async function loadBookings() {
    try {
      var user = await ensureAuth();

      // Show login prompt for anonymous users
      if (loginPrompt && user.isAnonymous) {
        loginPrompt.style.display = "";
      }

      var bookingsRef = collection(db, "bookings");
      var bookingsQuery = query(
        bookingsRef,
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      var snap = await getDocs(bookingsQuery);
      return snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    } catch (e) {
      console.warn("Failed to load bookings from Firestore:", e);
      return localList;
    }
  }

  function renderBookings(list) {
    if (!list.length) {
      root.innerHTML = '<div class="card"><div class="content" style="padding:20px; text-align:center;">' + t("no_bookings") + '</div></div>';
      return;
    }

    root.innerHTML = list.map(function(b) {
      var statusClass = b.status === "Pending" ? "yellow" : b.status === "Used" ? "green" : b.status === "Cancelled" ? "red" : "";
      return '<a class="card" href="booking.html?id=' + encodeURIComponent(b.id) + '" style="text-decoration:none; color:inherit;">' +
        '<div class="content" style="width:100%;">' +
          '<div class="row">' +
            '<div class="title">' + pickTitle(b) + '</div>' +
            '<div class="badge ' + statusClass + '">' + (b.status || "Pending") + '</div>' +
          '</div>' +
          '<div class="meta">🏢 ' + (b.venue || "-") + '</div>' +
          '<div class="meta">📅 ' + (b.date || "-") + ' • ' + (b.time || "-") + '</div>' +
          '<div class="meta">' + typeLabel(b.bookingType) + ' • ' + t("people") + ': ' + (b.people || 0) + '</div>' +
          '<div class="price" style="margin-top:8px;">💰 ' + formatMoneyUSD(b.finalTotalUSD) + ' (' + formatMoneyIQDFromUSD(b.finalTotalUSD) + ')</div>' +
        '</div>' +
      '</a>';
    }).join("");
  }

  loadBookings().then(renderBookings);
});
