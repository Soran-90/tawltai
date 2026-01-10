function getQueryParam(name) {
  const url = new URL(window.location.href);
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

function calcPrice(ev, bookingType, people) {
  // MVP pricing (simple):
  // entry = base
  // table = base * people * 1.5
  // vip   = base * people * 2.2
  const base = ev.priceFromUSD || 0;
  const p = Math.max(1, Number(people) || 1);

  let total = base * p;
  if (bookingType === "table") total = base * p * 1.5;
  if (bookingType === "vip") total = base * p * 2.2;

  // discount only if exists
  const discountPercent = Number(ev.discountPercent || 0);
  const discount = discountPercent ? (total * discountPercent / 100) : 0;
  const finalTotal = Math.max(0, total - discount);

  return { total, discountPercent, discount, finalTotal };
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
          ${ev.discountPercent ? `<div class="badge">${t("discount_badge")} ${ev.discountPercent}%</div>` : ""}
        </div>
        <div class="meta"><b>${t("venue")}:</b> ${ev.venue}</div>
        <div class="meta"><b>${t("date")}:</b> ${ev.date}</div>
        <div class="meta"><b>${t("time")}:</b> ${ev.time}</div>
        <div class="meta" style="margin-top:8px;"><b>${t("description")}:</b> ${pickDesc(ev)}</div>
        <div class="price" style="margin-top:10px;">${t("price_from")} $${ev.priceFromUSD}</div>
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

    const discountText = discountPercent
      ? ` • ${t("discount_badge")} ${discountPercent}% (-$${discount.toFixed(2)})`
      : "";

    priceLine.textContent = `Total: $${total.toFixed(2)}${discountText}  =>  Pay: $${finalTotal.toFixed(2)}`;
  }

  chips.forEach(c => c.addEventListener("click", () => setActive(c.getAttribute("data-type"))));
  peopleInput.addEventListener("input", updatePrice);

  confirmBtn.addEventListener("click", () => {
    const people = Math.max(1, Number(peopleInput.value || 1));
    const price = calcPrice(ev, bookingType, people);

    const booking = {
      id: "b_" + Date.now(),
      eventId: ev.id,
      title: pickTitle(ev),
      venue: ev.venue,
      date: ev.date,
      time: ev.time,
      bookingType,
      people,
      finalTotalUSD: Number(price.finalTotal.toFixed(2)),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem("bookings") || "[]");
    existing.unshift(booking);
    localStorage.setItem("bookings", JSON.stringify(existing));

    window.location.href = "my-bookings.html";
  });

  setActive("entry");
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();

  const id = getQueryParam("id");
  const ev = (window.MOCK_EVENTS || []).find(x => x.id === id);

  if (!ev) {
    const wrap = document.getElementById("eventWrap");
    if (wrap) wrap.innerHTML = `<div class="card"><div class="content">Event not found.</div></div>`;
    return;
  }

  renderEvent(ev);
  setupBooking(ev);

  // If user clicked Book Now, jump to booking section
  if (window.location.hash === "#book") {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  }
});
