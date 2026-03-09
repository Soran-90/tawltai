import {
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  onUserChange
} from "../../shared/js/auth.js";

const t = (k) => globalThis.t ? globalThis.t(k) : k;
const applyI18n = () => globalThis.applyI18n?.();

const loggedInView  = document.getElementById("loggedInView");
const authView      = document.getElementById("authView");
const welcomeMsg    = document.getElementById("welcomeMsg");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const userTypeDisplay  = document.getElementById("userTypeDisplay");
const logoutBtn     = document.getElementById("logoutBtn");

const tabLogin      = document.getElementById("tabLogin");
const tabRegister   = document.getElementById("tabRegister");
const formLogin     = document.getElementById("formLogin");
const formRegister  = document.getElementById("formRegister");

const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn      = document.getElementById("loginBtn");
const loginMsg      = document.getElementById("loginMsg");

const regEmail      = document.getElementById("regEmail");
const regPassword   = document.getElementById("regPassword");
const regPassword2  = document.getElementById("regPassword2");
const registerBtn   = document.getElementById("registerBtn");
const regMsg        = document.getElementById("regMsg");

// ── Tab switching ─────────────────────────────────────────────────
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  formLogin.style.display = "";
  formRegister.style.display = "none";
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  formRegister.style.display = "";
  formLogin.style.display = "none";
});

// ── Auth state ────────────────────────────────────────────────────
onUserChange((user) => {
  applyI18n();
  if (user && !user.isAnonymous) {
    // Logged in with real account
    loggedInView.style.display = "";
    authView.style.display = "none";
    welcomeMsg.textContent = t("logged_in_as") + (user.displayName ? " " + user.displayName : "") + "!";
    userEmailDisplay.textContent = "📧 " + (user.email || "");
    userTypeDisplay.textContent = "✓ " + t("register");
  } else {
    // Anonymous or not logged in
    loggedInView.style.display = "none";
    authView.style.display = "";
  }
});

// ── Login ─────────────────────────────────────────────────────────
loginBtn.addEventListener("click", async () => {
  loginMsg.textContent = "";
  const email = loginEmail.value.trim();
  const pwd   = loginPassword.value;

  if (!email || !pwd) {
    loginMsg.textContent = t("auth_error_invalid");
    return;
  }

  loginBtn.disabled = true;
  try {
    await loginWithEmail(email, pwd);
    showToast(t("login_success"));
  } catch (e) {
    const code = e.code || "";
    if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
      loginMsg.textContent = t("auth_error_invalid");
    } else {
      loginMsg.textContent = e.message || t("auth_error_invalid");
    }
  } finally {
    loginBtn.disabled = false;
  }
});

// ── Register ──────────────────────────────────────────────────────
registerBtn.addEventListener("click", async () => {
  regMsg.textContent = "";
  const email = regEmail.value.trim();
  const pwd   = regPassword.value;
  const pwd2  = regPassword2.value;

  if (!email || !pwd) {
    regMsg.textContent = t("auth_error_invalid");
    return;
  }
  if (pwd !== pwd2) {
    regMsg.textContent = t("passwords_no_match");
    return;
  }
  if (pwd.length < 6) {
    regMsg.textContent = t("auth_error_weak");
    return;
  }

  registerBtn.disabled = true;
  try {
    await registerWithEmail(email, pwd);
    showToast(t("register_success"));
  } catch (e) {
    const code = e.code || "";
    if (code.includes("email-already-in-use")) {
      regMsg.textContent = t("auth_error_exists");
    } else if (code.includes("weak-password")) {
      regMsg.textContent = t("auth_error_weak");
    } else {
      regMsg.textContent = e.message || t("auth_error_invalid");
    }
  } finally {
    registerBtn.disabled = false;
  }
});

// ── Logout ────────────────────────────────────────────────────────
logoutBtn.addEventListener("click", async () => {
  await logoutUser();
});

// ── Toast ─────────────────────────────────────────────────────────
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
