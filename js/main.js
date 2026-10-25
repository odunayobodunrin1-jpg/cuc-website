/* ==========================================================
   CUC website: shared script
   1. Injects the header (with logo) and footer on every page (edit the nav in ONE place: NAV below)
   2. Loads data/site.json and fills in the editable content
   3. Pop-up windows (chaplain biography, events with pictures, programs, gallery viewer)
   4. Page banners (set in data/site.json under "banners")
   Note: fetch() needs a local server. Use the VS Code "Live Server" extension.
   ========================================================== */

const NAV = [
  { label: "Home", href: "index.html" },
  { label: "Student Leaders", href: "student.html" },
  { label: "Fellowship", href: "fellowship.html" },
  { label: "Unit", href: "units.html" },
  { label: "Events", href: "events.html" },
  { label: "Gallery", href: "gallery.html" },
  { label: "Contact", href: "contact.html" },
  { label: "Give", href: "give.html", cls: "give" }
];

const currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}

function paragraphs(value) {
  const list = Array.isArray(value) ? value : [value];
  return list.filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && text != null) el.textContent = text;
}

/* Make sure a stylesheet is loaded (so every page gets the banner and pop-up picture styles) */
function ensureCss(href) {
  const has = [...document.querySelectorAll('link[rel="stylesheet"]')].some(l => (l.getAttribute("href") || "").endsWith(href));
  if (has) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

/* ---------- Pop-up window ---------- */
let modalEl = null;
let lastFocus = null;
let modalNav = null; // { go(step), to(index) } when the pop-up can flick between items

function ensureModal() {
  if (modalEl) return modalEl;
  modalEl = document.createElement("div");
  modalEl.className = "modal";
  modalEl.hidden = true;
  modalEl.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal-close" type="button" aria-label="Close" data-close>&times;</button>
      <div id="modal-media"></div>
      <div class="modal-head">
        <p class="eyebrow" id="modal-eyebrow"></p>
        <h2 id="modal-title"></h2>
      </div>
      <div class="modal-body" id="modal-body"></div>
    </div>`;
  document.body.appendChild(modalEl);

  modalEl.addEventListener("click", e => {
    if (e.target.hasAttribute("data-close")) { closeModal(); return; }
    const step = e.target.closest("[data-step]");
    if (step && modalNav) { modalNav.go(Number(step.dataset.step)); return; }
    const goto = e.target.closest("[data-goto]");
    if (goto && modalNav) modalNav.to(Number(goto.dataset.goto));
  });

  document.addEventListener("keydown", e => {
    if (modalEl.hidden) return;
    if (e.key === "Escape") closeModal();
    else if (modalNav && e.key === "ArrowRight") modalNav.go(1);
    else if (modalNav && e.key === "ArrowLeft") modalNav.go(-1);
  });

  // swipe left / right on the picture
  let sx = 0, sy = 0, tracking = false;
  modalEl.addEventListener("touchstart", e => {
    tracking = !!(modalNav && e.target.closest(".modal-media") && e.touches.length === 1);
    if (tracking) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
  }, { passive: true });
  modalEl.addEventListener("touchend", e => {
    if (!tracking || !e.changedTouches.length) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) modalNav.go(dx < 0 ? 1 : -1);
  }, { passive: true });
  return modalEl;
}

function openModal({ eyebrow, title, html, media, nav }) {
  const m = ensureModal();
  if (m.hidden) lastFocus = document.activeElement;
  modalNav = nav || null;
  m.querySelector("#modal-media").innerHTML = media || "";
  m.querySelector("#modal-eyebrow").textContent = eyebrow || "";
  m.querySelector("#modal-title").textContent = title || "";
  m.querySelector("#modal-body").innerHTML = html || "";
  m.hidden = false;
  document.body.classList.add("modal-open");
  m.querySelector(".modal-box").scrollTop = 0;
  m.querySelector(".modal-close").focus();
}

function closeModal() {
  if (!modalEl) return;
  modalEl.hidden = true;
  modalNav = null;
  document.body.classList.remove("modal-open");
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* Picture strip used by the event and gallery pop-ups: counter, arrows and dots */
function mediaControls(total, idx, noun) {
  if (total < 2) return "";
  const dots = Array.from({ length: total }, (_, k) =>
    `<button type="button" class="modal-dot${k === idx ? " active" : ""}" data-goto="${k}" aria-label="Go to ${noun} ${k + 1}"></button>`
  ).join("");
  return `
    <span class="modal-count">${idx + 1} / ${total}</span>
    <button type="button" class="modal-arrow prev" data-step="-1" aria-label="Previous ${noun}">&#8249;</button>
    <button type="button" class="modal-arrow next" data-step="1" aria-label="Next ${noun}">&#8250;</button>
    <div class="modal-dots">${dots}</div>`;
}

/* ---------- Header & footer ---------- */
function renderHeader(chapel) {
  const el = document.getElementById("site-header");
  if (!el) return;
  const links = NAV.map(n => {
    const active = n.href.toLowerCase() === currentPage ? " active" : "";
    return `<a href="${n.href}" class="${(n.cls || "") + active}">${esc(n.label)}</a>`;
  }).join("");
  // The logo hides itself if the image file is missing.
  const logo = chapel.logo
    ? `<img class="brand-logo" src="${esc(chapel.logo)}" alt="${esc(chapel.short || "CUC")} logo" onerror="this.remove()">`
    : "";
  el.innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="index.html">
          ${logo}
          <span class="brand-text">${esc(chapel.name)}<small>Chrisland University</small></span>
        </a>
        <button class="menu-toggle" aria-label="Open menu" aria-expanded="false">&#9776;</button>
        <nav class="nav" id="nav">${links}</nav>
      </div>
    </header>`;
  const btn = el.querySelector(".menu-toggle");
  const nav = el.querySelector(".nav");
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
}

function renderFooter(chapel) {
  const el = document.getElementById("site-footer");
  if (!el) return;
  const links = NAV.map(n => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join("");
  el.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <p class="footer-brand">${esc(chapel.name)}</p>
          <p>${esc(chapel.tagline)}</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <ul>${links}</ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li>${esc(chapel.address)}</li>
            <li><a href="mailto:${esc(chapel.email)}">${esc(chapel.email)}</a></li>
            <li>${esc(chapel.phone)}</li>
          </ul>
        </div>
      </div>
      <div class="container footer-bottom">&copy; ${new Date().getFullYear()} ${esc(chapel.name)}. All rights reserved.</div>
      <div class="container footer-bottom"><a class="dev-btn" href="https://wa.me/2349014726779?text=Hello%20Odunayo%2C%20I%20saw%20your%20work%20on%20the%20CUC%20website%20and%20I%20must%20commend%20you%20for%20the%20great%20job.%20I%20would%20love%20to%20have%20you%20build%20a%20similar%20website%20for%20me." target="_blank" rel="noopener">Developed by Odunayo Bodunrin</a></div>
      </footer>`;
}

/* ---------- Page banners ----------
   Picture banners for the inner pages. Edit data/site.json -> "banners".
   A page that is not listed there (Student Leaders, Gallery) keeps the plain banner. */
function applyPageBanner(data) {
  const page = document.body.dataset.page;
  const src = data.banners && data.banners[page];
  const el = document.querySelector(".page-banner");
  if (!el || !src) return;
  el.classList.add("has-photo");
  const bg = document.createElement("div");
  bg.className = "page-banner-bg";
  bg.setAttribute("aria-hidden", "true");
  bg.style.backgroundImage = `url("${String(src).replace(/"/g, "%22")}")`;
  el.insertBefore(bg, el.firstChild);
}

/* ---------- Home page ---------- */
function renderHome(data) {
  const { chapel, stats, chaplain, overview, belonging, vision, mission, news } = data;

  setText("hero-title", chapel.name);
  setText("hero-tagline", chapel.tagline);

  const statsEl = document.getElementById("stats");
  if (statsEl) {
    statsEl.innerHTML = stats.map(s => `
      <div class="stat">
        <div class="stat-value">${esc(s.value)}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>`).join("");
  }

  setText("chaplain-role", chaplain.title);
  setText("chaplain-name", chaplain.name);
  setText("chaplain-bio", chaplain.bio);

  const profileBtn = document.getElementById("chaplain-profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      openModal({
        eyebrow: chaplain.title,
        title: chaplain.name,
        html: paragraphs(chaplain.biography || chaplain.bio)
      });
    });
  }

  const photoWrap = document.getElementById("chaplain-photo-wrap");
  if (photoWrap) {
    const stripped = chaplain.name.replace(/^((Reverend|Rev\.?|Canon|Dr\.?|Pastor|Prof\.?)\s+)+/i, "").trim();
    const firstLetter = stripped.match(/\p{L}/u);
    const initial = esc((firstLetter ? firstLetter[0] : "C").toUpperCase());
    const showPlaceholder = () => {
      photoWrap.innerHTML = `<div class="chaplain-photo placeholder" aria-hidden="true">${initial}</div>`;
    };
    const img = new Image();
    img.className = "chaplain-photo";
    img.alt = chaplain.name;
    img.onload = () => { photoWrap.innerHTML = ""; photoWrap.appendChild(img); };
    img.onerror = showPlaceholder;
    showPlaceholder();
    img.src = chaplain.photo;
  }

  setText("overview-heading", overview.heading);
  setText("overview-intro", overview.intro);
  const pillars = document.getElementById("pillars");
  if (pillars) {
    pillars.innerHTML = overview.pillars.map(p => `
      <article class="pillar">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
        ${p.link ? `<a class="pillar-link" href="${esc(p.link)}">${esc(p.linkLabel || "Learn more")} &rarr;</a>` : ""}
      </article>`).join("");
  }

  setText("belonging-heading", belonging.heading);
  const items = document.getElementById("belonging-items");
  if (items) {
    items.innerHTML = belonging.items.map(i => `
      <div class="panel-item"><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`).join("");
  }
  setText("conclusion-quote", belonging.conclusion.quote);
  setText("conclusion-by", "— " + belonging.conclusion.by);

  setText("vision-text", vision);
  setText("mission-text", mission);

  const newsEl = document.getElementById("news-grid");
  if (newsEl) {
    const sorted = [...news].sort((a, b) => b.date.localeCompare(a.date));
    newsEl.innerHTML = sorted.map(n => {
      const d = new Date(n.date + "T00:00:00");
      const pretty = isNaN(d) ? n.date : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      return `
        <article class="news-card">
          <div class="news-date">${esc(pretty)}</div>
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.summary)}</p>
          <a class="read" href="${esc(n.link || "#")}">Read more &rarr;</a>
        </article>`;
    }).join("");
  }
}

/* ---------- Programs & Upcoming Events page ---------- */
function dateParts(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return { day: "", mon: "", full: iso };
  return {
    day: d.getDate(),
    mon: d.toLocaleDateString("en-GB", { month: "short" }),
    full: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  };
}

/* One event in the pop-up, with a picture on top and next / previous buttons
   (arrows, dots, keyboard arrows and swipe). */
function showEvent(events, i) {
  const total = events.length;
  const idx = (i + total) % total;
  const e = events[idx];
  const p = dateParts(e.date);
  const img = e.image
    ? `<img src="${esc(e.image)}" alt="${esc(e.title)}" onerror="this.remove()">`
    : "";
  const meta = [p.full, e.time, e.venue].filter(Boolean).map(m => `<span>${esc(m)}</span>`).join("");
  openModal({
    eyebrow: "Upcoming Event",
    title: e.title,
    media: `<div class="modal-media">${img}${mediaControls(total, idx, "event")}</div>`,
    html: `<div class="modal-meta">${meta}</div>${paragraphs(e.details || e.summary)}`,
    nav: {
      go: step => showEvent(events, idx + step),
      to: n => showEvent(events, n)
    }
  });
}

function renderEventsPage(data) {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
  const events = [...(data.events || [])]
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const programs = data.programs || [];

  const eventsEl = document.getElementById("events-list");
  if (eventsEl) {
    if (!events.length) {
      eventsEl.innerHTML = `<div class="coming-soon"><h3>No upcoming events right now</h3><p>Please check back soon, or see our programs below.</p></div>`;
    } else {
      eventsEl.innerHTML = events.map((e, i) => {
        const p = dateParts(e.date);
        return `
          <article class="event-card">
            <div class="date-badge"><span class="day">${esc(p.day)}</span><span class="mon">${esc(p.mon)}</span></div>
            <div class="event-body">
              <h3>${esc(e.title)}</h3>
              <p class="event-meta">${esc([e.time, e.venue].filter(Boolean).join(" · "))}</p>
              <p>${esc(e.summary)}</p>
              <button class="btn btn-navy btn-small" type="button" data-event="${i}">More details</button>
            </div>
          </article>`;
      }).join("");
      eventsEl.addEventListener("click", ev => {
        const b = ev.target.closest("[data-event]");
        if (b) showEvent(events, Number(b.dataset.event));
      });
    }
  }

  const progEl = document.getElementById("programs-grid");
  if (progEl) {
    progEl.innerHTML = programs.map((p, i) => `
      <article class="program-card">
        <h3>${esc(p.title)}</h3>
        <p class="program-schedule">${esc(p.schedule)}</p>
        <p>${esc(p.summary)}</p>
        <button class="btn btn-navy btn-small" type="button" data-program="${i}">Learn more</button>
      </article>`).join("");
    progEl.addEventListener("click", ev => {
      const b = ev.target.closest("[data-program]");
      if (!b) return;
      const p = programs[Number(b.dataset.program)];
      openModal({
        eyebrow: p.schedule,
        title: p.title,
        html: paragraphs(p.details || p.summary)
      });
    });
  }
}

/* ---------- Gallery page ---------- */
/* Click a picture to see the whole thing, then flick through with arrows, dots, keys or swipe. */
function showGalleryItem(items, i) {
  const total = items.length;
  const idx = (i + total) % total;
  const g = items[idx];
  const img = g.image
    ? `<img src="${esc(g.image)}" alt="${esc(g.title)}" onerror="this.remove()">`
    : "";
  openModal({
    eyebrow: "Gallery",
    title: g.title,
    media: `<div class="modal-media is-full">${img}${mediaControls(total, idx, "photo")}</div>`,
    html: g.description ? paragraphs(g.description) : "",
    nav: {
      go: step => showGalleryItem(items, idx + step),
      to: n => showGalleryItem(items, n)
    }
  });
}

function renderGalleryPage(data) {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  const items = data.gallery || [];
  if (!items.length) {
    grid.innerHTML = `<div class="coming-soon"><h3>No photos yet</h3><p>Please check back soon.</p></div>`;
    return;
  }
  grid.innerHTML = items.map((g, i) => `
    <figure class="gallery-item" data-i="${i}" role="button" tabindex="0" aria-label="View ${esc(g.title)}">
      ${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.title)}" loading="lazy" onerror="this.remove()">` : ""}
      <figcaption>
        <h3>${esc(g.title)}</h3>
        ${g.description ? `<p>${esc(g.description)}</p>` : ""}
      </figcaption>
    </figure>`).join("");
  const open = el => {
    const item = el.closest("[data-i]");
    if (item) showGalleryItem(items, Number(item.dataset.i));
  };
  grid.addEventListener("click", e => open(e.target));
  grid.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e.target); }
  });
}

/* ---------- Give page ---------- */
function renderGivePage(data) {
  const g = data.give || {};
  if (g.verse) {
    setText("give-verse", "\u201C" + g.verse.text + "\u201D");
    setText("give-verse-ref", "\u2014 " + g.verse.reference + (g.verse.version ? " (" + g.verse.version + ")" : ""));
  }
  setText("give-eyebrow", g.eyebrow);
  setText("give-heading", g.heading);
  setText("give-intro", g.intro);

  const box = document.getElementById("give-accounts");
  if (box) {
    const accounts = g.accounts || [];
    box.innerHTML = accounts.length ? accounts.map(a => `
      <article class="account-card">
        <p class="account-purpose">${esc(a.purpose)}</p>
        <dl>
          <div><dt>Bank</dt><dd>${esc(a.bankName)}</dd></div>
          <div><dt>Account name</dt><dd>${esc(a.accountName)}</dd></div>
          <div><dt>Account number</dt><dd class="account-number">${esc(a.accountNumber)}</dd></div>
        </dl>
        ${a.note ? `<p class="account-note">${esc(a.note)}</p>` : ""}
        <button class="btn btn-navy btn-small copy-account" type="button" data-number="${esc(a.accountNumber)}">Copy account number</button>
      </article>`).join("") : `<div class="coming-soon"><h3>Bank details coming soon</h3></div>`;
    box.addEventListener("click", e => {
      const b = e.target.closest(".copy-account");
      if (!b) return;
      const num = b.dataset.number;
      const done = () => { const t = b.textContent; b.textContent = "Copied \u2713"; setTimeout(() => { b.textContent = t; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(num).then(done, done);
      else {
        const ta = document.createElement("textarea");
        ta.value = num; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        ta.remove(); done();
      }
    });
  }
  const notes = document.getElementById("give-notes");
  if (notes) notes.innerHTML = (g.notes || []).map(n => `<li>${esc(n)}</li>`).join("");
}

/* ---------- Contact page ---------- */
// Sends a form. If "contact.formEndpoint" in site.json is filled in (for example a Formspree URL),
// it is posted there. If it is empty, the visitor's email app opens with the message ready to send.
async function sendForm(form, data, subject, lines) {
  const status = form.querySelector(".form-status");
  const btn = form.querySelector("button[type=submit]");
  const endpoint = (data.contact && data.contact.formEndpoint) || "";
  const payload = {};
  new FormData(form).forEach((v, k) => { payload[k] = v; });

  const show = (msg, ok) => {
    status.textContent = msg;
    status.className = "form-status " + (ok ? "ok" : "err");
  };

  if (endpoint) {
    btn.disabled = true;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(Object.assign({ _subject: subject }, payload))
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.reset();
      show("Thank you! Your message has been sent.", true);
    } catch (err) {
      show("Sorry, something went wrong. Please try again or email us directly.", false);
    }
    btn.disabled = false;
    return;
  }

  const body = lines(payload).filter(Boolean).join("\n");
  location.href = "mailto:" + data.chapel.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  show("Your email app should open with your message ready. Just press send.", true);
}

function renderContactPage(data) {
  const chapel = data.chapel;
  const contact = data.contact || {};

  const info = document.getElementById("contact-info");
  if (info) {
    const hours = (contact.hours || []).map(h => `<li><span>${esc(h.day)}</span><strong>${esc(h.time)}</strong></li>`).join("");
    info.innerHTML = `
      <div class="info-card"><h3>Visit Us</h3><p>${esc(chapel.address)}</p></div>
      <div class="info-card"><h3>Call</h3><p><a href="tel:${esc(chapel.phone)}">${esc(chapel.phone)}</a></p></div>
      <div class="info-card"><h3>Email</h3><p><a href="mailto:${esc(chapel.email)}">${esc(chapel.email)}</a></p></div>
      ${hours ? `<div class="info-card"><h3>Office Hours</h3><ul class="hours">${hours}</ul></div>` : ""}`;
  }

  const map = document.getElementById("contact-map");
  if (map) {
    const q = contact.mapQuery || chapel.address;
    map.innerHTML = `<iframe title="Campus map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed"></iframe>`;
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", ev => {
      ev.preventDefault();
      if (contactForm.website.value) return; // spam trap
      sendForm(contactForm, data, "Website message: " + (contactForm.topic.value || "General"), p => [
        "Name: " + p.name,
        "Email: " + p.email,
        p.phone ? "Phone: " + p.phone : "",
        "Topic: " + p.topic,
        "",
        p.message
      ]);
    });
  }

  const testimonyForm = document.getElementById("testimony-form");
  if (testimonyForm) {
    const nameField = testimonyForm.querySelector("[name=name]");
    const anon = testimonyForm.querySelector("[name=anonymous]");
    anon.addEventListener("change", () => {
      nameField.disabled = anon.checked;
      if (anon.checked) nameField.value = "";
    });
    testimonyForm.addEventListener("submit", ev => {
      ev.preventDefault();
      if (testimonyForm.website.value) return;
      sendForm(testimonyForm, data, "Testimony: " + (testimonyForm.category.value || "Testimony"), p => [
        "Name: " + (anon.checked ? "Anonymous" : (p.name || "Not given")),
        p.contact ? "Contact: " + p.contact : "",
        "Category: " + p.category,
        "Permission to share publicly: " + (p.consent ? "Yes" : "No"),
        "",
        p.testimony
      ]);
    });
  }
}

/* ---------- Boot ---------- */
async function boot() {
  // Styles for page banners, event pictures, gallery and contact (loaded once, on every page)
  ensureCss("css/extras.css");
  ensureCss("css/pages.css");

  let data;
  try {
    const res = await fetch("data/site.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
  } catch (err) {
    console.error("Could not load data/site.json. Open the site with VS Code Live Server.", err);
    data = { chapel: { name: "Chrisland University Chapel", tagline: "", address: "", email: "", phone: "" } };
  }
  renderHeader(data.chapel);
  renderFooter(data.chapel);
  applyPageBanner(data);
  const page = document.body.dataset.page;
  if (page === "home" && data.stats) renderHome(data);
  if (page === "events") renderEventsPage(data);
  if (page === "gallery") renderGalleryPage(data);
  if (page === "contact") renderContactPage(data);
  if (page === "give") renderGivePage(data);

  // Tell js/animations.js that the page content is ready
  window.CUC_DATA = data;
  document.dispatchEvent(new CustomEvent("cuc:ready", { detail: data }));
}

document.addEventListener("DOMContentLoaded", boot);