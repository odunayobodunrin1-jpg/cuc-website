/* ==========================================================
   CUC website: motion & interaction layer
   Loaded AFTER js/main.js (see the bottom of each HTML page).
   Adds: rotating hero banner (swipe on phones), scroll reveal,
   count-up numbers, button ripple, nav effects, scroll progress,
   back-to-top, and a nicer mobile menu.
   Banner slides are edited in data/site.json under "hero".
   ========================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("js-anim");

  function $(id) { return document.getElementById(id); }

  /* ---------- 1. Scroll reveal ---------- */
  var SINGLES = [".section-head", ".overview-intro", ".chaplain-card", ".panel", ".center-action", ".coming-soon"];
  var ZOOMS = [".chaplain-card", ".panel"];
  var GROUPS = [".stats", ".pillars", ".panel-items", ".vm", ".news-grid", ".event-list", ".program-grid"];

  function initReveal() {
    var targets = [];
    SINGLES.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.classList.add("reveal"); targets.push(el); });
    });
    ZOOMS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.classList.add("reveal-zoom"); });
    });
    GROUPS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.classList.add("reveal-stagger"); targets.push(el); });
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("in"); });
      statsInView = true;
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        if (entry.target.classList.contains("stats")) { statsInView = true; maybeCount(); }
        io.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. Count-up numbers ---------- */
  var statsInView = false;
  var dataReady = false;
  var counted = false;

  function maybeCount() {
    if (counted || !statsInView || !dataReady) return;
    var vals = document.querySelectorAll(".stat-value");
    if (!vals.length) return;
    counted = true;
    vals.forEach(function (el) {
      var txt = el.textContent.trim();
      if (!/^\d+$/.test(txt) || reduceMotion) return;
      var target = parseInt(txt, 10);
      var dur = 1400;
      var t0 = null;
      el.textContent = "0";
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- 3. Hero banner slider ---------- */
  function initHero(data) {
    var hero = $("hero");
    var wrap = $("hero-slides");
    var cfg = data && data.hero;
    if (!hero || !wrap || !cfg || !Array.isArray(cfg.slides) || !cfg.slides.length) return;

    var slides = cfg.slides;
    var interval = Math.max(3000, Number(cfg.interval) || 6500);
    hero.style.setProperty("--hero-ms", interval + "ms");

    var text = $("hero-text");
    var eyebrowEl = $("hero-eyebrow");
    var titleEl = $("hero-title");
    var leadEl = $("hero-tagline");

    var slideEls = slides.map(function (s, i) {
      var d = document.createElement("div");
      d.className = "hero-slide v" + (i % 4);
      if (s.image) {
        var img = document.createElement("div");
        img.className = "hero-slide-img";
        img.style.backgroundImage = 'url("' + String(s.image).replace(/"/g, "%22") + '")';
        d.appendChild(img);
      }
      wrap.appendChild(d);
      return d;
    });

    var index = 0;
    var dots = [];
    var timer = 0;
    var remaining = interval;
    var startedAt = 0;
    var hold = { user: reduceMotion, pointer: false, focus: false, touch: false, hidden: document.hidden, offscreen: false };

    function setText(s, animate) {
      function apply() {
        if (eyebrowEl) { eyebrowEl.textContent = s.eyebrow || ""; eyebrowEl.style.display = s.eyebrow ? "" : "none"; }
        if (titleEl && s.title) titleEl.textContent = s.title;
        if (leadEl) leadEl.textContent = s.text || "";
      }
      if (!animate || reduceMotion || !text) { apply(); return; }
      text.classList.add("out");
      setTimeout(function () {
        apply();
        text.classList.remove("out");
        text.classList.add("pre");
        void text.offsetWidth; // restart from below, then glide into place
        text.classList.remove("pre");
      }, 380);
    }

    function show(n, animateText) {
      slideEls.forEach(function (el, i) { el.classList.toggle("active", i === n); });
      dots.forEach(function (d, i) {
        d.classList.toggle("active", i === n);
        if (i === n) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
      setText(slides[n], animateText);
    }

    function running() {
      return !(hold.user || hold.pointer || hold.focus || hold.touch || hold.hidden || hold.offscreen);
    }

    function update() {
      var go_ = running() && slides.length > 1;
      hero.classList.toggle("is-paused", !go_);
      hero.classList.toggle("no-auto", hold.user && reduceMotion);
      if (go_ && !timer) {
        startedAt = performance.now();
        timer = setTimeout(function () { timer = 0; goTo(index + 1); }, remaining);
      } else if (!go_ && timer) {
        clearTimeout(timer);
        timer = 0;
        remaining = Math.max(400, remaining - (performance.now() - startedAt));
      }
    }

    function goTo(n) {
      n = (n + slides.length) % slides.length;
      if (timer) { clearTimeout(timer); timer = 0; }
      if (n !== index) { index = n; show(index, true); }
      remaining = interval;
      update();
    }

    /* controls */
    if (slides.length > 1) {
      var controls = document.createElement("div");
      controls.className = "hero-controls";
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Banner controls");

      var chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
      var chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

      var prev = document.createElement("button");
      prev.type = "button"; prev.className = "hero-arrow"; prev.setAttribute("aria-label", "Previous slide"); prev.innerHTML = chevL;
      prev.addEventListener("click", function () { goTo(index - 1); });

      var next = document.createElement("button");
      next.type = "button"; next.className = "hero-arrow"; next.setAttribute("aria-label", "Next slide"); next.innerHTML = chevR;
      next.addEventListener("click", function () { goTo(index + 1); });

      var dotWrap = document.createElement("div");
      dotWrap.className = "hero-dots";
      slides.forEach(function (s, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "hero-dot";
        b.setAttribute("aria-label", "Go to slide " + (i + 1) + ": " + (s.title || ""));
        b.addEventListener("click", function () { goTo(i); });
        dotWrap.appendChild(b);
        dots.push(b);
      });

      var pause = document.createElement("button");
      pause.type = "button"; pause.className = "hero-pause";
      pause.setAttribute("aria-label", hold.user ? "Play slideshow" : "Pause slideshow");
      pause.setAttribute("aria-pressed", hold.user ? "true" : "false");
      pause.innerHTML =
        '<svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' +
        '<svg class="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
      pause.addEventListener("click", function () {
        hold.user = !hold.user;
        pause.setAttribute("aria-pressed", hold.user ? "true" : "false");
        pause.setAttribute("aria-label", hold.user ? "Play slideshow" : "Pause slideshow");
        update();
      });

      controls.appendChild(prev);
      controls.appendChild(dotWrap);
      controls.appendChild(next);
      controls.appendChild(pause);
      hero.appendChild(controls);
    }

    /* pause while the visitor is interacting */
    // (only the arrows/dots hold it still, so a mouse resting on the banner never freezes it)
    var ctl = hero.querySelector(".hero-controls");
    if (ctl) {
      ctl.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hold.pointer = true; update(); } });
      ctl.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { hold.pointer = false; update(); } });
    }
    hero.addEventListener("focusin", function () { hold.focus = true; update(); });
    hero.addEventListener("focusout", function () { hold.focus = false; update(); });
    document.addEventListener("visibilitychange", function () { hold.hidden = document.hidden; update(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { hold.offscreen = !es[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(hero);
    }

    /* swipe on phones */
    var sx = 0, sy = 0, tracking = false;
    hero.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
      hold.touch = true; update();
    }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      hold.touch = false;
      if (tracking && e.changedTouches.length) {
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { goTo(index + (dx < 0 ? 1 : -1)); tracking = false; return; }
      }
      tracking = false;
      update();
    }, { passive: true });
    hero.addEventListener("touchcancel", function () { hold.touch = false; tracking = false; update(); }, { passive: true });

    /* start: first slide appears with a gentle zoom */
    show(0, false);
    void wrap.offsetWidth;
    update();
  }

  /* ---------- 4. Scroll progress, header state, back-to-top ---------- */
  function initScrollUI() {
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    body.appendChild(bar);

    var top = document.createElement("button");
    top.type = "button";
    top.className = "to-top";
    top.setAttribute("aria-label", "Back to top");
    top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>';
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
    body.appendChild(top);

    var ticking = false;
    function frame() {
      var y = window.pageYOffset || root.scrollTop || 0;
      var max = root.scrollHeight - window.innerHeight;
      bar.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : "0");
      body.classList.toggle("is-scrolled", y > 24);
      top.classList.toggle("show", y > 600);
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    frame();
  }

  /* ---------- 5. Button ripple ---------- */
  function initRipple() {
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest && e.target.closest(".btn");
      if (!btn || reduceMotion) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var s = document.createElement("span");
      s.className = "ripple";
      s.style.width = s.style.height = size + "px";
      s.style.left = (e.clientX - r.left - size / 2) + "px";
      s.style.top = (e.clientY - r.top - size / 2) + "px";
      btn.appendChild(s);
      setTimeout(function () { s.remove(); }, 700);
    }, { passive: true });
  }

  /* ---------- 6. Mobile menu polish ---------- */
  function initMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.querySelector(".site-header .nav");
    if (!toggle || !nav) return;

    function close() {
      nav.classList.remove("open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = "&#9776;";
    }
    // main.js toggles the menu first; this runs right after it
    toggle.addEventListener("click", function () {
      var open = nav.classList.contains("open");
      toggle.classList.toggle("is-open", open);
      toggle.innerHTML = open ? "&times;" : "&#9776;";
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !e.target.closest(".site-header")) close();
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1180) close(); });
  }

  /* ---------- Boot ---------- */
  // Static page parts can be prepared immediately (this script sits at the end of <body>).
  initReveal();
  initScrollUI();
  initRipple();

  // Data-driven parts wait until main.js has loaded data/site.json and drawn the page.
  document.addEventListener("cuc:ready", function (e) {
    dataReady = true;
    initMenu();
    initHero(e.detail);
    maybeCount();
  });
  if (window.CUC_DATA && !dataReady) {
    // main.js already finished before this script ran
    dataReady = true;
    initMenu();
    initHero(window.CUC_DATA);
    maybeCount();
  }
})();