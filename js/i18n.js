const LANGS = {
  ar: () => window.LANG_AR,
  en: () => window.LANG_EN,
  ku: () => window.LANG_KU,
};

function getLang() {
  return localStorage.getItem("lang") || "ar";
}

function setLang(lang) {
  localStorage.setItem("lang", lang);
  location.reload();
}

function t(key) {
  const lang = getLang();
  const dict = (LANGS[lang] ? LANGS[lang]() : LANGS.ar()) || {};
  return dict[key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });

  // RTL/LTR
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === "ar" || lang === "ku") ? "rtl" : "ltr";
}
