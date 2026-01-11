import { db } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// === helpers to access globals loaded by defer scripts ===
const applyI18n = (...a) => globalThis.applyI18n?.(...a);
const t = (k) => globalThis.t ? globalThis.t(k) : k;
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";

function getQueryParam(name) {
  const url = new URL(globalThis.location.href);
  return url.searchParams.get(name);
}

function pickTitle(ev) {
  const lang = getLang();
  if (lang === "ar") return ev.title_ar;
  if (lang === "ku") return ev.title_ku;
  return ev.title_en;
}

function pickDesc(ev) {
  const lang = getLang();
  if (lang === "ar") return ev.description_ar;
  if (lang === "ku") return ev.description_ku;
  return ev.description_en;
}

function usdToIqd(usd) {
  const rate = (globalThis.APP_SETTINGS && globalThis.APP_SETTINGS.usdToIqd) ? globalThis.APP_SETTINGS.usdToIqd : 1310;
  return Math.round(Number(usd || 0) * rate);
}
function moneyUSD(n) { return `$${Number(n || 0).toFixed(2)}`; }
function moneyIQDFromUSD(usd) { return `${usdToIqd(usd).toLocaleString("en-US")} IQD`; }

function calcPrice(ev, bookingType, people) {
  const base = ev.priceFromUSD || 0;
  const p = Math.max(1, Number(people) || 1);

  let total = base * p;
  if (bookingType === "table") total = base * p * 1.5;
  if (bookingType === "vip") total = base * p * 2.2;

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

function renderEvent(ev) {
  const wrap = document.getElementById("eventWrap");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="card">
      <div class="thumb" style="width:100%; height:220px; background-image:url('${ev.img}')"></div>
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title">${pickTitle(ev)}</div>
          ${ev.discountPercent ? `<div class="badge">${t("discount")} ${ev.discountPercent}%</div>` : ""}
        </div>
        <div class="meta"><b>${t("venue")}:</b> ${ev.venue}</div>
        <div class="meta"><b>${t("date")}:</b> ${ev.date}</div>
        <div class="meta"><b>${t("time")}:</b> ${ev.time}</div>
        <div class="meta" style="margin-top:8px;"><b>${t("description")}:</b> ${pickDesc(ev)}</div>
        <div class="price" style="margin-top:10px;">
          ${t("price_from")} ${moneyUSD(ev.priceFromUSD)} (${moneyIQDFromUSD(ev.priceFromUSD)})
        </div>
      </div>
    </div>
  `;
}

function setupBooking(ev) {
  let bookingType = "entry";
  const chips = Array.from(document.querySelectorAll("#book .chip[data-type]"));
  const peopleInput = document.getElementById("peopleCount");
  const priceLine = document.getElementById("priceLine");
  const confirmBtn = document.getElementById("confirmBtn");

  function setActive(type) {
    bookingType = type;
    chips.forEach(c => c.classList.toggle("active", c.getAttribute("data-type") === type));
    updatePrice();
  }

  function updatePrice() {
    const people = Number(peopleInput.value || 1);
    const { total, discountPercent, discount, finalTotal } = calcPrice(ev, bookingType, people);

    const parts = [];
    parts.push(`${t("total")}: ${moneyUSD(total)} (${moneyIQDFromUSD(total)})`);
    if (discountPercent) parts.push(`${t("discount")}: ${discountPercent}% (-${moneyUSD(discount)})`);
    parts.push(`${t("final_pay")}: ${moneyUSD(finalTotal)} (${moneyIQDFromUSD(finalTotal)})`);
    priceLine.textContent = parts.join(" • ");
  }

  chips.forEach(c => c.addEventListener("click", () => setActive(c.getAttribute("data-type"))));
  peopleInput.addEventListener("input", updatePrice);

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;

    const people = Math.max(1, Number(peopleInput.value || 1));
    const price = calcPrice(ev, bookingType, people);

    const bookingId = "b_" + Date.now();
    const code = makeCode();

    const bookingDoc = {
      id: bookingId,
      code,
      eventId: ev.id,
      title_ar: ev.title_ar,
      title_en: ev.title_en,
      title_ku: ev.title_ku,
      venue: ev.venue,
      city: ev.city,
      date: ev.date,
      time: ev.time,
      bookingType,
      people,
      finalTotalUSD: Number(price.finalTotal.toFixed(2)),
      status: "Pending",
      used: false,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "bookings", bookingId), bookingDoc);

      // مؤقتًا (بدون حسابات): نخزن محلي حتى تظهر بـ "حجوزاتي"
      const local = JSON.parse(localStorage.getItem("bookings") || "[]");
      local.unshift({
        id: bookingId,
        code,
        title: pickTitle(ev),
        venue: ev.venue,
        date: ev.date,
        time: ev.time,
        bookingType,
        people,
        finalTotalUSD: bookingDoc.finalTotalUSD,
        status: "Pending",
        eventId: ev.id
      });
      localStorage.setItem("bookings", JSON.stringify(local));

      globalThis.location.href = `booking.html?id=${encodeURIComponent(bookingId)}&v=1`;
    } catch (e) {
      alert("Firebase error: " + (e?.message || e));
      confirmBtn.disabled = false;
    }
  });

  setActive("entry");
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();

  const id = getQueryParam("id");
  const events = globalThis.MOCK_EVENTS || [];
  const ev = events.find(x => x.id === id);

  if (!ev) {
    alert("Event not found. Check data.js / id param.");
    return;
  }

  renderEvent(ev);
  setupBooking(ev);

  if (globalThis.location.hash === "#book") {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  }
});
