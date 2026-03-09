import { db, auth } from "../../shared/js/firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const t = (k) => globalThis.t ? globalThis.t(k) : k;
const applyI18n = () => globalThis.applyI18n?.();

// ── DOM refs ──────────────────────────────────────────────────────
const loginSection    = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginBtn        = document.getElementById("loginBtn");
const logoutBtn       = document.getElementById("logoutBtn");
const loginMsg        = document.getElementById("loginMsg");
const adminEventsList = document.getElementById("adminEventsList");
const statEvents      = document.getElementById("statEvents");
const statBookings    = document.getElementById("statBookings");

// Modal
const eventModal      = document.getElementById("eventModal");
const modalTitle      = document.getElementById("modalTitle");
const addEventBtn     = document.getElementById("addEventBtn");
const modalCloseBtn   = document.getElementById("modalCloseBtn");
const cancelFormBtn   = document.getElementById("cancelFormBtn");
const saveEventBtn    = document.getElementById("saveEventBtn");
const formMsg         = document.getElementById("formMsg");

// Form fields
const formEventId  = document.getElementById("formEventId");
const formType     = document.getElementById("formType");
const formCity     = document.getElementById("formCity");
const formVenue    = document.getElementById("formVenue");
const formTitleAr  = document.getElementById("formTitleAr");
const formTitleEn  = document.getElementById("formTitleEn");
const formTitleKu  = document.getElementById("formTitleKu");
const formDate     = document.getElementById("formDate");
const formTime     = document.getElementById("formTime");
const formPrice    = document.getElementById("formPrice");
const formDiscount = document.getElementById("formDiscount");
const formCapacity = document.getElementById("formCapacity");
const formImg      = document.getElementById("formImg");
const formDescAr   = document.getElementById("formDescAr");
const formDescEn   = document.getElementById("formDescEn");
const formDescKu   = document.getElementById("formDescKu");
const formActive   = document.getElementById("formActive");

// ── Auth helpers ──────────────────────────────────────────────────
async function isAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

function showLogin(msg = "") {
  loginSection.style.display = "";
  dashboardSection.style.display = "none";
  if (msg) loginMsg.textContent = msg;
}

async function showDashboard() {
  loginSection.style.display = "none";
  dashboardSection.style.display = "";
  await loadStats();
  await loadEvents();
}

// ── Login / Logout ────────────────────────────────────────────────
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  loginMsg.textContent = "";
  loginBtn.disabled = true;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const admin = await isAdmin(cred.user.uid);
    if (!admin) {
      await signOut(auth);
      showLogin(t("not_authorized"));
    }
  } catch (e) {
    loginMsg.textContent = t("auth_error_invalid");
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  applyI18n();
  if (!user) { showLogin(); return; }
  const admin = await isAdmin(user.uid);
  if (!admin) { await signOut(auth); showLogin(t("not_authorized")); return; }
  showDashboard();
});

// ── Stats ─────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const evSnap = await getCountFromServer(collection(db, "events"));
    const bkSnap = await getCountFromServer(collection(db, "bookings"));
    statEvents.textContent = evSnap.data().count;
    statBookings.textContent = bkSnap.data().count;
  } catch {
    statEvents.textContent = "–";
    statBookings.textContent = "–";
  }
}

// ── Load events list ──────────────────────────────────────────────
async function loadEvents() {
  adminEventsList.innerHTML = `<div class="loading-wrap">${t("loading")}</div>`;
  try {
    const snap = await getDocs(query(collection(db, "events"), orderBy("date", "asc")));
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderEventsList(events);
  } catch (e) {
    adminEventsList.innerHTML = `<div class="meta" style="color:#f87171;">Error: ${e.message}</div>`;
  }
}

function renderEventsList(events) {
  if (!events.length) {
    adminEventsList.innerHTML = `<div class="card"><div class="content">${t("no_events")}</div></div>`;
    return;
  }

  adminEventsList.innerHTML = events.map(ev => `
    <div class="card" style="margin-bottom:10px;">
      <div class="thumb" style="background-image:url('${ev.img || ""}');"></div>
      <div class="content" style="width:100%;">
        <div class="row">
          <div class="title" style="font-size:14px;">${ev.title_ar || ev.title_en || ""}</div>
          <div class="badge ${ev.active ? 'green' : 'red'}">${ev.active ? "✓" : "✗"}</div>
        </div>
        <div class="meta">${ev.venue} • ${ev.city}</div>
        <div class="meta">${ev.date} ${ev.time || ""}</div>
        <div class="meta">$${ev.priceFromUSD || 0}${ev.discountPercent ? ` • ${ev.discountPercent}% off` : ""}</div>
        <div class="actions">
          <button class="btn" onclick="openEditModal('${ev.id}')">${t("edit_event")}</button>
          <button class="btn danger" onclick="deleteEvent('${ev.id}')">${t("delete_event")}</button>
        </div>
      </div>
    </div>
  `).join("");
}

// ── Modal open/close ──────────────────────────────────────────────
function openModal() {
  eventModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  eventModal.style.display = "none";
  document.body.style.overflow = "";
  formMsg.textContent = "";
}

[modalCloseBtn, cancelFormBtn].forEach(btn => btn.addEventListener("click", closeModal));
eventModal.addEventListener("click", (e) => { if (e.target === eventModal) closeModal(); });

function clearForm() {
  formEventId.value = "";
  formType.value = "nightclub";
  formCity.value = "Erbil";
  formVenue.value = "";
  formTitleAr.value = "";
  formTitleEn.value = "";
  formTitleKu.value = "";
  formDate.value = "";
  formTime.value = "22:00";
  formPrice.value = "";
  formDiscount.value = "0";
  formCapacity.value = "";
  formImg.value = "";
  formDescAr.value = "";
  formDescEn.value = "";
  formDescKu.value = "";
  formActive.checked = true;
}

addEventBtn.addEventListener("click", () => {
  clearForm();
  modalTitle.textContent = t("add_event");
  openModal();
});

// Expose to inline onclick handlers
globalThis.openEditModal = async (eventId) => {
  try {
    const snap = await getDoc(doc(db, "events", eventId));
    if (!snap.exists()) return;
    const ev = snap.data();

    formEventId.value = eventId;
    formType.value = ev.type || "nightclub";
    formCity.value = ev.city || "";
    formVenue.value = ev.venue || "";
    formTitleAr.value = ev.title_ar || "";
    formTitleEn.value = ev.title_en || "";
    formTitleKu.value = ev.title_ku || "";
    formDate.value = ev.date || "";
    // Convert "10:00 PM" to 24h for time input
    formTime.value = convertTo24h(ev.time || "22:00");
    formPrice.value = ev.priceFromUSD || "";
    formDiscount.value = ev.discountPercent || "0";
    formCapacity.value = ev.capacity || "";
    formImg.value = ev.img || "";
    formDescAr.value = ev.description_ar || "";
    formDescEn.value = ev.description_en || "";
    formDescKu.value = ev.description_ku || "";
    formActive.checked = ev.active !== false;

    modalTitle.textContent = t("edit_event");
    openModal();
  } catch (e) {
    alert("Error loading event: " + e.message);
  }
};

globalThis.deleteEvent = async (eventId) => {
  if (!confirm(t("confirm_delete"))) return;
  try {
    await deleteDoc(doc(db, "events", eventId));
    showToast(t("event_deleted"));
    await loadEvents();
    await loadStats();
  } catch (e) {
    alert("Error: " + e.message);
  }
};

// ── Save event ────────────────────────────────────────────────────
saveEventBtn.addEventListener("click", async () => {
  formMsg.textContent = "";
  const titleAr = formTitleAr.value.trim();
  const venue = formVenue.value.trim();
  const date = formDate.value;
  const price = Number(formPrice.value);

  if (!titleAr || !venue || !date || !price) {
    formMsg.textContent = "يرجى ملء الحقول الأساسية (العنوان، المكان، التاريخ، السعر)";
    return;
  }

  saveEventBtn.disabled = true;

  const timeStr = formatTime12h(formTime.value);
  const eventData = {
    type: formType.value,
    city: formCity.value.trim() || "Erbil",
    venue,
    title_ar: titleAr,
    title_en: formTitleEn.value.trim(),
    title_ku: formTitleKu.value.trim(),
    date,
    time: timeStr,
    priceFromUSD: price,
    discountPercent: Number(formDiscount.value) || 0,
    capacity: Number(formCapacity.value) || 0,
    img: formImg.value.trim(),
    description_ar: formDescAr.value.trim(),
    description_en: formDescEn.value.trim(),
    description_ku: formDescKu.value.trim(),
    active: formActive.checked,
  };

  try {
    const existingId = formEventId.value;
    if (existingId) {
      await updateDoc(doc(db, "events", existingId), { ...eventData, updatedAt: serverTimestamp() });
      showToast(t("event_updated"));
    } else {
      await addDoc(collection(db, "events"), { ...eventData, createdAt: serverTimestamp() });
      showToast(t("event_added"));
    }
    closeModal();
    await loadEvents();
    await loadStats();
  } catch (e) {
    formMsg.textContent = "Error: " + e.message;
  } finally {
    saveEventBtn.disabled = false;
  }
});

// ── Helpers ───────────────────────────────────────────────────────
function convertTo24h(time12) {
  if (!time12) return "22:00";
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12;
  let [, h, m, period] = match;
  h = parseInt(h, 10);
  if (period.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period.toUpperCase() === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

function formatTime12h(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
});
