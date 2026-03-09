import { db } from "../shared/js/firebase.js";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const t = (k) => globalThis.t ? globalThis.t(k) : k;
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";
const applyI18n = () => globalThis.applyI18n?.();

function pickTitle(ev) {
  const lang = getLang();
  if (lang === "ar") return ev.title_ar || ev.title_en || "";
  if (lang === "ku") return ev.title_ku || ev.title_en || "";
  return ev.title_en || ev.title_ar || "";
}

function renderEvents(list) {
  const root = document.getElementById("eventsList");
  if (!root) return;

  if (!list.length) {
    root.innerHTML = `<div class="card"><div class="content" style="padding:20px; text-align:center;">${t("no_events")}</div></div>`;
    return;
  }

  root.innerHTML = list.map(ev => `
    <div class="card">
      <div class="thumb" style="background-image:url('${ev.img || ""}')"></div>
      <div class="content">
        <div class="row">
          <div class="title">${pickTitle(ev)}</div>
          ${ev.discountPercent ? `<div class="badge">${t("discount_badge")} ${ev.discountPercent}%</div>` : ""}
        </div>
        <div class="meta">${ev.venue} • ${ev.city}</div>
        <div class="meta">${ev.date} • ${ev.time || ""}</div>
        <div class="price">${t("price_from")} $${ev.priceFromUSD}</div>
        <div class="actions">
          <a class="btn" href="customer/event.html?id=${encodeURIComponent(ev.id)}">${t("view_details")}</a>
          <a class="btn primary" href="customer/event.html?id=${encodeURIComponent(ev.id)}#book">${t("book_now")}</a>
        </div>
      </div>
    </div>
  `).join("");
}

async function loadEventsFromFirestore() {
  const snap = await getDocs(
    query(collection(db, "events"), where("active", "==", true), orderBy("date", "asc"))
  );
  if (!snap.empty) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return null;
}

function applyFilters(events, filter, searchQuery) {
  let result = [...events];
  const today = new Date().toISOString().split("T")[0];
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  if (filter === "today") {
    result = result.filter(ev => ev.date === today);
  } else if (filter === "week") {
    result = result.filter(ev => ev.date >= today && ev.date <= weekLater);
  } else if (filter === "concerts") {
    result = result.filter(ev => ev.type === "concert");
  } else if (filter === "nightclubs") {
    result = result.filter(ev => ev.type === "nightclub");
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(ev =>
      (ev.venue || "").toLowerCase().includes(q) ||
      pickTitle(ev).toLowerCase().includes(q) ||
      (ev.city || "").toLowerCase().includes(q)
    );
  }

  return result;
}

document.addEventListener("DOMContentLoaded", async () => {
  applyI18n();

  const root = document.getElementById("eventsList");
  if (!root) return;
  root.innerHTML = `<div class="loading-wrap">${t("loading")}</div>`;

  let allEvents = [];

  try {
    const firestoreEvents = await loadEventsFromFirestore();
    allEvents = firestoreEvents || window.MOCK_EVENTS || [];
  } catch {
    allEvents = window.MOCK_EVENTS || [];
  }

  let currentFilter = "all";
  let currentSearch = "";

  function refresh() {
    renderEvents(applyFilters(allEvents, currentFilter, currentSearch));
  }

  // Filter chips
  document.querySelectorAll(".filters .chip[data-filter]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filters .chip[data-filter]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.getAttribute("data-filter");
      refresh();
    });
  });

  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentSearch = searchInput.value.trim();
      refresh();
    });
  }

  refresh();
});
