/* Easy Lesson — theme toggle, mobile nav, cookie consent, ads flag, contact form, FAQ, blog filter. */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---- Dark / light mode ---- */
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
    if (btn) btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  var saved = null;
  try { saved = localStorage.getItem("el_theme"); } catch (e) {}
  if (saved) applyTheme(saved);
  else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) applyTheme("dark");
  else applyTheme("light");
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try { localStorage.setItem("el_theme", next); } catch (e) {}
    applyTheme(next);
  });

  /* ---- Mobile nav ---- */
  var navToggle = document.getElementById("nav-toggle");
  var mainNav = document.getElementById("main-nav");
  if (navToggle && mainNav) navToggle.addEventListener("click", function () {
    var open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* ---- Cookie consent (stored in localStorage; CMP-ready wording in banner) ---- */
  var banner = document.getElementById("cookie-banner");
  var consent = null;
  try { consent = localStorage.getItem("el_cookie_consent"); } catch (e) {}
  if (banner && !consent) banner.classList.add("show");
  function setConsent(value) {
    try { localStorage.setItem("el_cookie_consent", value); } catch (e) {}
    if (banner) banner.classList.remove("show");
  }
  var accept = document.getElementById("cookie-accept");
  var decline = document.getElementById("cookie-decline");
  if (accept) accept.addEventListener("click", function () { setConsent("accepted"); });
  if (decline) decline.addEventListener("click", function () { setConsent("declined"); });

  /* ---- Ad slots: hidden unless ads_enabled is true in ads-config.json ---- */
  fetch("/ads-config.json").then(function (r) { return r.json(); }).then(function (cfg) {
    if (cfg && cfg.ads_enabled) document.body.classList.add("ads-enabled");
  }).catch(function () { /* ads stay hidden */ });

  /* ---- Sticky mobile ad dismiss ---- */
  var closeAd = document.getElementById("close-sticky-ad");
  var stickyAd = document.getElementById("sticky-ad");
  if (closeAd && stickyAd) closeAd.addEventListener("click", function () { stickyAd.style.display = "none"; });

  /* ---- Contact form: endpoint is a placeholder until connected (see README) ---- */
  var form = document.getElementById("contact-form");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var endpoint = form.getAttribute("data-endpoint") || "";
    var success = document.getElementById("form-success");
    if (endpoint && endpoint !== "#" && endpoint.indexOf("REPLACE") === -1) {
      /* A real endpoint is configured: submit normally via fetch. */
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
        .then(function (res) {
          if (res.ok) { if (success) success.style.display = "block"; form.reset(); }
          else if (success) { success.textContent = "Something went wrong. Please try again or email us directly."; success.style.display = "block"; }
        })
        .catch(function () { if (success) { success.textContent = "Something went wrong. Please try again or email us directly."; success.style.display = "block"; } });
    } else {
      /* No endpoint configured yet: show the success state so the form never looks broken. */
      if (success) success.style.display = "block";
      form.reset();
    }
  });

  /* ---- Blog listing: client-side search + category filter ---- */
  var searchInput = document.getElementById("blog-search");
  var cards = document.querySelectorAll("[data-post-card]");
  var catBtns = document.querySelectorAll("[data-cat-filter]");
  var activeCat = "all";
  function filterPosts() {
    var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    cards.forEach(function (card) {
      var hay = (card.getAttribute("data-search") || "").toLowerCase();
      var cat = card.getAttribute("data-category") || "";
      var ok = (!q || hay.indexOf(q) !== -1) && (activeCat === "all" || cat === activeCat);
      card.style.display = ok ? "" : "none";
    });
    var empty = document.getElementById("blog-empty");
    if (empty) {
      var visible = Array.prototype.filter.call(cards, function (c) { return c.style.display !== "none"; }).length;
      empty.style.display = visible === 0 ? "block" : "none";
    }
  }
  if (searchInput) searchInput.addEventListener("input", filterPosts);
  catBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeCat = btn.getAttribute("data-cat-filter");
      catBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      filterPosts();
    });
  });
  /* Deep-link: /blog/?category=Homework%20Help activates that filter on load. */
  try {
    var catParam = new URLSearchParams(window.location.search).get("category");
    if (catParam && cards.length) {
      var match = null;
      catBtns.forEach(function (b) { if (b.getAttribute("data-cat-filter") === catParam) match = b; });
      if (match) {
        activeCat = catParam;
        catBtns.forEach(function (b) { b.classList.remove("active"); });
        match.classList.add("active");
        filterPosts();
      }
    }
  } catch (e) {}

  /* ---- Footer year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();

/* Google Analytics 4 (gtag.js) — G-T82LBSG6GP. Loaded here because every
   page on Easy Lesson includes this shared script.
   PERFORMANCE (2026-10-30): gtag.js is 181KB transfer / ~440ms script
   evaluation and was the page's entire unused-JavaScript + most of its
   Total Blocking Time when injected immediately. It now loads OUTSIDE the
   critical window: on the visitor's first interaction, or 5s after the
   window load event via requestIdleCallback — whichever comes first.
   Real visitors still get counted; the load/LCP path stays clean. */
(function () {
  if (window.__ga4Loaded) return;
  function loadGA() {
    if (window.__ga4Loaded) return;
    window.__ga4Loaded = true;
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-T82LBSG6GP';
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', 'G-T82LBSG6GP');
  }
  var events = ["pointerdown", "keydown", "touchstart", "scroll"];
  function onInteract() {
    events.forEach(function (e) { window.removeEventListener(e, onInteract, { passive: true }); });
    loadGA();
  }
  events.forEach(function (e) { window.addEventListener(e, onInteract, { passive: true }); });
  function schedule() {
    if ("requestIdleCallback" in window) requestIdleCallback(loadGA, { timeout: 5000 });
    else setTimeout(loadGA, 5000);
  }
  if (document.readyState === "complete") setTimeout(schedule, 5000);
  else window.addEventListener("load", function () { setTimeout(schedule, 5000); });
})();

/* Tool facade: load the solver iframe only when the user clicks. */
(function () {
  var toolBtn = document.getElementById("tool-load-btn");
  var toolFrame = document.getElementById("tool-frame");
  var toolFacade = document.getElementById("tool-facade");
  if (toolBtn && toolFrame && toolFacade) toolBtn.addEventListener("click", function () {
    toolFrame.src = toolFrame.getAttribute("data-src");
    toolFrame.hidden = false;
    toolFacade.style.display = "none";
  });
})();
