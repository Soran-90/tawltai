import { db } from "../../shared/js/firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ensureAuth } from "../../shared/js/auth.js";

const applyI18n = () => globalThis.applyI18n?.();
const t = (k) => globalThis.t ? globalThis.t(k) : k;
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";

function getQueryParam(name) {
  return new URL(globalThis.location.href).searchParams.get(name);
}

function pickTitle(ev) {
  const lang = getLang();
  if (lang === "ar") return ev.title_ar || ev.title_en || "";
  if (lang === "ku") return ev.title_ku || ev.title_en || "";
  return ev.title_en || ev.title_ar || "";
}

function pickDesc(ev) {
  const lang = getLang();
  if (lang === "ar") return ev.description_ar || ev.description_en || "";
  if (lang === "ku") return ev.description_ku || ev.description_en || "";
  return ev.description_en || ev.description_ar || "";
}

function usdToIqd(usd) {
  const rate = (globalThis.APP_SETTINGS && globalThis.APP_SETTINGS.usdToIqd) ? globalThis.APP_SETTINGS.usdToIqd : 1310;
  return Math.round(Number(usd || 0) * rate);
}
function moneyUSD(n) { return "$" + Number(n || 0).toFixed(2); }
function moneyIQDFromUSD(usd) { return usdToIqd(usd).toLocaleString("en-US") + " IQD"; }

function calcPrice(ev, bookingType, people) {
  const base = ev.priceFromUSD || 0;
  const p = Math.max(1, Number(people) || 1);
  let total = base * p;
  if (bookingType === "table") total = base * p * 1.5;
  if (bookingType === "vip")   total = base * p * 2.2;
  const discountPercent = Number(ev.discountPercent || 0);
  const discount = discountPercent ? (total * discountPercent / 100) : 0;
  const finalTotal = Math.max(0, total - discount);
  return { total, discountPercent, discount, finalTotal };
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TAW-";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function loadEvent(id) {
  try {
    const snap = await getDoc(doc(db, "events", id));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  } catch { /* ignore */ }
  const events = globalThis.MOCK_EVENTS || [];
  return events.find(x => x.id === id) || null;
}

function renderEvent(ev) {
  const wrap = document.getElementById("eventWrap");
  if (!wrap) return;
  wrap.innerHTML =
    '<div class="card">' +
      '<div class="thumb" style="width:100%; height:220px; background-image:url(\'' + (ev.img || "") + '\')"></div>' +
      '<div class="content" style="width:100%;">' +
        '<div class="row">' +
          '<div class="title">' + pickTitle(ev) + '</div>' +
          (ev.discountPercent ? '<div class="badge">' + t("discount") + ' ' + ev.discountPercent + '%</div>' : '') +
        '</div>' +
        '<div class="meta"><b>' + t("venue") + ':</b> ' + ev.venue + '</div>' +
        '<div class="meta"><b>' + t("date") + ':</b> ' + ev.date + '</div>' +
        '<div class="meta"><b>' + t("time") + ':</b> ' + (ev.time || "") + '</div>' +
        (ev.capacity ? '<div class="meta">👥 ' + ev.capacity + ' ' + t("people") + '</div>' : '') +
        '<div class="meta" style="margin-top:8px;"><b>' + t("description") + ':</b> ' + pickDesc(ev) + '</div>' +
        '<div class="price" style="margin-top:10px;">' +
          t("price_from") + ' ' + moneyUSD(ev.priceFromUSD) + ' (' + moneyIQDFromUSD(ev.priceFromUSD) + ')' +
        '</div>' +
      '</div>' +
    '</div>';
}

function setupBooking(ev) {
  let bookingType = "entry";
  let selectedPayment = "cash";

  const chips = Array.from(document.querySelectorAll("#book .chip[data-type]"));
  const peopleInput  = document.getElementById("peopleCount");
  const priceLine    = document.getElementById("priceLine");
  const confirmBtn   = document.getElementById("confirmBtn");
  const step1        = document.getElementById("bookStep1");
  const step2        = document.getElementById("bookStep2");
  const step2summary = document.getElementById("step2summary");

  function setActive(type) {
    bookingType = type;
    chips.forEach(c => c.classList.toggle("active", c.getAttribute("data-type") === type));
    updatePrice();
  }

  function updatePrice() {
    const people = Number(peopleInput.value || 1);
    const priceData = calcPrice(ev, bookingType, people);
    const parts = [];
    parts.push(t("total") + ": " + moneyUSD(priceData.total) + " (" + moneyIQDFromUSD(priceData.total) + ")");
    if (priceData.discountPercent) {
      parts.push(t("discount") + ": " + priceData.discountPercent + "% (-" + moneyUSD(priceData.discount) + ")");
    }
    priceLine.innerHTML = parts.join(" • ") +
      '<br/><b>' + t("final_pay") + ': ' + moneyUSD(priceData.finalTotal) + ' (' + moneyIQDFromUSD(priceData.finalTotal) + ')</b>';
  }

  chips.forEach(c => c.addEventListener("click", () => setActive(c.getAttribute("data-type"))));
  peopleInput.addEventListener("input", updatePrice);

  // Step 1 → Step 2
  confirmBtn.addEventListener("click", () => {
    const people = Math.max(1, Number(peopleInput.value || 1));
    const priceData = calcPrice(ev, bookingType, people);
    const typeLabel = bookingType === "entry" ? t("entry") : bookingType === "table" ? t("table") : "VIP";

    step2summary.innerHTML =
      '<div class="meta"><b>' + t("booking_type") + ':</b> ' + typeLabel + ' &nbsp;•&nbsp; ' + t("people") + ': ' + people + '</div>' +
      '<div class="price" style="margin-top:6px;">' + t("final_pay") + ': ' +
        moneyUSD(priceData.finalTotal) + ' (' + moneyIQDFromUSD(priceData.finalTotal) + ')</div>';

    step1.style.display = "none";
    step2.style.display = "";
    step2.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Payment option selection
  document.querySelectorAll(".payment-option[data-payment]").forEach(function(opt) {
    if (opt.classList.contains("disabled")) return;
    opt.addEventListener("click", function() {
      document.querySelectorAll(".payment-option[data-payment]").forEach(function(o) { o.classList.remove("selected"); });
      opt.classList.add("selected");
      selectedPayment = opt.getAttribute("data-payment");
    });
  });

  // Back button
  document.getElementById("backToStep1Btn").addEventListener("click", function() {
    step2.style.display = "none";
    step1.style.display = "";
  });

  // Final confirm
  document.getElementById("finalConfirmBtn").addEventListener("click", async function() {
    var finalBtn = document.getElementById("finalConfirmBtn");
    finalBtn.disabled = true;

    try {
      var people = Math.max(1, Number(peopleInput.value || 1));
      var price = calcPrice(ev, bookingType, people);
      var user = await ensureAuth();
      var bookingId = "b_" + Date.now();
      var code = makeCode();

      var bookingDoc = {
        id: bookingId,
        userId: user.uid,
        userEmail: user.email || null,
        code: code,
        eventId: ev.id,
        title_ar: ev.title_ar || "",
        title_en: ev.title_en || "",
        title_ku: ev.title_ku || "",
        venue: ev.venue,
        city: ev.city,
        date: ev.date,
        time: ev.time || "",
        bookingType: bookingType,
        people: people,
        finalTotalUSD: Number(price.finalTotal.toFixed(2)),
        paymentMethod: selectedPayment,
        status: "Pending",
        used: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "bookings", bookingId), bookingDoc);

      var local = JSON.parse(localStorage.getItem("bookings") || "[]");
      local.unshift({
        id: bookingId, code: code,
        title: pickTitle(ev), venue: ev.venue,
        date: ev.date, time: ev.time || "",
        bookingType: bookingType, people: people,
        finalTotalUSD: bookingDoc.finalTotalUSD,
        paymentMethod: selectedPayment,
        status: "Pending", eventId: ev.id
      });
      localStorage.setItem("bookings", JSON.stringify(local));

      globalThis.location.href = "booking.html?id=" + encodeURIComponent(bookingId) + "&v=1";
    } catch (e) {
      alert("Error: " + (e && e.message ? e.message : e));
      document.getElementById("finalConfirmBtn").disabled = false;
    }
  });

  setActive("entry");
}

document.addEventListener("DOMContentLoaded", async function() {
  applyI18n();

  var id = getQueryParam("id");
  if (!id) { alert("No event ID"); return; }

  var eventWrap = document.getElementById("eventWrap");
  eventWrap.innerHTML = '<div class="loading-wrap">' + t("loading") + '</div>';

  var ev = await loadEvent(id);
  if (!ev) {
    eventWrap.innerHTML = '<div class="card"><div class="content">Event not found.</div></div>';
    return;
  }

  renderEvent(ev);
  setupBooking(ev);

  if (globalThis.location.hash === "#book") {
    document.getElementById("book") && document.getElementById("book").scrollIntoView({ behavior: "smooth" });
  }
});
