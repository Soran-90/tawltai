import { db } from "../../shared/js/firebase.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ensureAuth } from "../../shared/js/auth.js";

const applyI18n = () => globalThis.applyI18n?.();
const t = (k) => globalThis.t ? globalThis.t(k) : k;
const getLang = () => globalThis.getLang ? globalThis.getLang() : "ar";

function getQueryParam(name) {
  return new URL(globalThis.location.href).searchParams.get(name);
}

function usdToIqd(usd) {
  var rate = (window.APP_SETTINGS && window.APP_SETTINGS.usdToIqd) ? window.APP_SETTINGS.usdToIqd : 1310;
  return Math.round(Number(usd || 0) * rate);
}
function moneyUSD(n) { return "$" + Number(n || 0).toFixed(2); }
function moneyIQDFromUSD(usd) { return usdToIqd(usd).toLocaleString("en-US") + " IQD"; }

function renderQR(targetId, text) {
  var el = document.getElementById(targetId);
  if (!el || typeof QRCode === "undefined") return;
  el.innerHTML = "";
  new QRCode(el, { text: text, width: 180, height: 180 });
}

function pickTitle(b) {
  if (b.title) return b.title;
  var lang = getLang();
  if (lang === "ar") return b.title_ar || b.title_en || b.title_ku || "Event";
  if (lang === "ku") return b.title_ku || b.title_en || b.title_ar || "Event";
  return b.title_en || b.title_ar || b.title_ku || "Event";
}

function shareOnWhatsApp(b) {
  var lang = getLang();
  var title = pickTitle(b);
  var payMethod = b.paymentMethod === "cash" ? t("pay_cash") : (b.paymentMethod || "");
  var msg =
    "🎟️ " + t("booking_confirmed") + "\n" +
    "━━━━━━━━━━━━━━\n" +
    "📌 " + title + "\n" +
    "🏢 " + (b.venue || "") + "\n" +
    "📅 " + (b.date || "") + " • " + (b.time || "") + "\n" +
    "🔑 " + t("booking_code_label") + ": " + b.code + "\n" +
    "💰 " + moneyUSD(b.finalTotalUSD) + " (" + moneyIQDFromUSD(b.finalTotalUSD) + ")\n" +
    (payMethod ? "💵 " + payMethod + "\n" : "") +
    "━━━━━━━━━━━━━━\n" +
    "طاولتي | Tawltai";

  var url = "https://wa.me/?text=" + encodeURIComponent(msg);
  window.open(url, "_blank");
}

function copyCode(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(function() {
      showToast(t("code_copied"));
    });
  } else {
    var ta = document.createElement("textarea");
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(t("code_copied"));
  }
}

function showToast(msg) {
  var existing = document.querySelector(".toast");
  if (existing) existing.remove();
  var toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

async function cancelBooking(bookingId) {
  if (!confirm(t("confirm_cancel"))) return;
  try {
    await updateDoc(doc(db, "bookings", bookingId), {
      status: "Cancelled",
      cancelledAt: serverTimestamp()
    });
    // Update localStorage
    var local = JSON.parse(localStorage.getItem("bookings") || "[]");
    local = local.map(function(b) {
      return b.id === bookingId ? Object.assign({}, b, { status: "Cancelled" }) : b;
    });
    localStorage.setItem("bookings", JSON.stringify(local));
    showToast(t("booking_cancelled"));
    setTimeout(function() { location.href = "./my-bookings.html"; }, 1500);
  } catch (e) {
    alert("Error: " + (e && e.message ? e.message : e));
  }
}

document.addEventListener("DOMContentLoaded", async function() {
  applyI18n();

  var bookingId = getQueryParam("id");
  var wrap = document.getElementById("bookingWrap");
  var localList = JSON.parse(localStorage.getItem("bookings") || "[]");

  // Show success banner if coming fresh from booking
  var isNew = getQueryParam("v") === "1";

  async function loadBooking() {
    try {
      await ensureAuth();
      var snap = await getDoc(doc(db, "bookings", bookingId));
      if (!snap.exists()) return null;
      return snap.data();
    } catch (e) {
      console.warn("Firestore failed:", e);
      return null;
    }
  }

  var fetched = await loadBooking();
  var b = fetched || localList.find(function(x) { return x.id === bookingId; }) || null;

  if (!b) {
    wrap.innerHTML = '<div class="card"><div class="content">Booking not found.</div></div>';
    return;
  }

  var qrUrl = new URL("../venue/check.html", globalThis.location.href);
  qrUrl.searchParams.set("id", b.id || bookingId);
  qrUrl.searchParams.set("code", b.code);

  var statusClass = b.status === "Pending" ? "yellow" : b.status === "Used" ? "green" : b.status === "Cancelled" ? "red" : "";
  var payLabel = b.paymentMethod === "cash" ? t("pay_cash") : (b.paymentMethod || "");
  var typeLabel = b.bookingType === "entry" ? t("entry") : b.bookingType === "table" ? t("table") : "VIP";

  wrap.innerHTML =
    (isNew ? '<div class="success-banner"><div class="big">🎉</div><div class="success-title">' + t("booking_confirmed") + '</div></div>' : "") +
    '<div class="card">' +
      '<div class="content" style="width:100%;">' +
        '<div class="row">' +
          '<div class="title">' + pickTitle(b) + '</div>' +
          '<div class="badge ' + statusClass + '">' + (b.status || "Pending") + '</div>' +
        '</div>' +
        '<div class="meta">🏢 ' + (b.venue || "") + '</div>' +
        '<div class="meta">📅 ' + (b.date || "") + ' • ' + (b.time || "") + '</div>' +
        '<div class="meta">👥 ' + typeLabel + ' • ' + (b.people || 1) + ' ' + t("people") + '</div>' +
        (payLabel ? '<div class="meta">💵 ' + payLabel + '</div>' : '') +

        // Code display
        '<div style="margin-top:14px;">' +
          '<div class="form-label" style="opacity:.7;">' + t("booking_code_label") + '</div>' +
          '<div class="code-display" id="codeDisplay">' + b.code + '</div>' +
        '</div>' +

        // QR code
        '<div class="card" style="margin-top:12px; background:#161620;">' +
          '<div class="content" style="width:100%;">' +
            '<div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap;">' +
              '<div id="qrBox" style="background:#fff; padding:10px; border-radius:12px;"></div>' +
              '<div>' +
                '<div class="meta" style="opacity:1; margin-bottom:4px;">' + t("scan_qr") + '</div>' +
                '<div class="meta">' + t("scan_qr_hint") + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Price
        '<div class="price" style="margin-top:12px;">' +
          '💰 ' + t("pay") + ': ' + moneyUSD(b.finalTotalUSD) + ' (' + moneyIQDFromUSD(b.finalTotalUSD) + ')' +
        '</div>' +

        // Action buttons
        '<div class="actions" style="margin-top:14px;">' +
          '<button class="btn whatsapp" id="whatsappBtn">📱 ' + t("share_whatsapp") + '</button>' +
          '<button class="btn" id="copyBtn">📋 ' + t("copy_code") + '</button>' +
          (b.status === "Pending" ? '<button class="btn danger" id="cancelBtn">' + t("cancel_booking") + '</button>' : '') +
        '</div>' +

      '</div>' +
    '</div>';

  // Render QR
  renderQR("qrBox", qrUrl.toString());

  // Button handlers
  document.getElementById("whatsappBtn").addEventListener("click", function() { shareOnWhatsApp(b); });
  document.getElementById("copyBtn").addEventListener("click", function() { copyCode(b.code); });

  var cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function() { cancelBooking(b.id || bookingId); });
  }
});
