/* ==========================================================
   CUC website: Student Leaders, Fellowship and Units pages
   Loaded AFTER js/main.js (it uses main.js for the pop-up window).

   You do NOT need to edit this file to change names, pictures,
   posts, contacts or bios. Edit these files instead:
     data/leaders.json       -> Student Leaders page
     data/fellowships.json   -> Fellowship page
     data/units.json         -> Units page
   Remember: fetch() needs a local server (VS Code "Live Server").
   ========================================================== */
(function () {
  "use strict";

  var page = document.body.getAttribute("data-page");
  if (page !== "student" && page !== "fellowship" && page !== "units") return;

  /* ---------- small helpers ---------- */
  function text(v) { return v == null ? "" : String(v); }
  function attr(v) { return esc(text(v)).replace(/"/g, "&quot;"); }
  function list(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function paras(v) {
    return list(v).filter(Boolean).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  }

  function initials(name) {
    var clean = text(name).replace(/^((Reverend|Rev\.?|Canon|Dr\.?|Pastor|Prof\.?|Engr\.?|Mr\.?|Mrs\.?|Miss|Ms\.?|Deacon|Deaconess|Evang\.?|Elder|Bro\.?|Sis\.?)\s+)+/i, "").trim();
    var words = clean.split(/\s+/).filter(Boolean);
    if (!words.length) return "C";
    var first = (words[0].match(/\p{L}/u) || ["C"])[0];
    var second = words.length > 1 ? (words[words.length - 1].match(/\p{L}/u) || [""])[0] : "";
    return (first + second).toUpperCase();
  }

  /* Picture with initials behind it: if the image file is missing, the initials stay visible.
     Used for cards (the picture fills the frame). Click it to see the whole picture. */
  function photo(src, name, cls) {
    var img = src
      ? '<img src="' + attr(src) + '" alt="' + attr(name) + '" loading="lazy" onerror="this.remove()">'
      : "";
    return '<div class="pp-photo ' + (cls || "") + (src ? " is-zoomable" : "") + '"><span class="pp-initials" aria-hidden="true">' + esc(initials(name)) + "</span>" + img + "</div>";
  }

  /* Full picture (never cropped, rounded corners) for the profile pop-up. */
  function fullPhoto(src, name) {
    if (!src) {
      return '<div class="pp-photo profile-initials"><span class="pp-initials" aria-hidden="true">' + esc(initials(name)) + "</span></div>";
    }
    return '<figure class="pp-full is-zoomable">' +
      '<img src="' + attr(src) + '" alt="' + attr(name) + '" onerror="var f=this.parentNode;f.className=\'pp-photo profile-initials\';f.innerHTML=\'<span class=&quot;pp-initials&quot;>' + esc(initials(name)) + '</span>\'">' +
      "</figure>";
  }

  function load(url, done) {
    var mount = document.getElementById("pp-grid");
    fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(done)
      .catch(function (err) {
        console.error("Could not load " + url + ". Open the site with VS Code Live Server.", err);
        if (mount) mount.innerHTML = '<div class="coming-soon"><h3>Content could not be loaded</h3><p>Please check that <strong>' + esc(url) + "</strong> exists and is valid, and that the site is opened with Live Server.</p></div>";
      });
  }

  function setDelays(grid) {
    [].forEach.call(grid.children, function (c, i) { c.style.setProperty("--i", i); });
  }

  /* ---------- Click-to-view picture (lightbox) ---------- */
  var box, boxImg, boxCap, lastFocus;
  function buildBox() {
    box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Picture viewer");
    box.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close picture">&times;</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(box);
    boxImg = box.querySelector("img");
    boxCap = box.querySelector("figcaption");
    box.addEventListener("click", function (e) {
      if (e.target !== boxImg) closeBox();   /* click anywhere except the picture closes it */
    });
  }
  function openBox(src, alt) {
    if (!box) buildBox();
    lastFocus = document.activeElement;
    boxImg.src = src;
    boxImg.alt = alt || "";
    boxCap.textContent = alt || "";
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    requestAnimationFrame(function () { box.classList.add("show"); });
    box.querySelector(".lightbox-close").focus();
  }
  function closeBox() {
    if (!box || box.hidden) return;
    box.classList.remove("show");
    box.hidden = true;
    boxImg.removeAttribute("src");
    document.body.classList.remove("lightbox-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var img = e.target.closest && e.target.closest(".is-zoomable img");
    if (img) openBox(img.currentSrc || img.src, img.alt);
  });
  /* capture phase so Esc closes the picture first, and the pop-up behind it stays open */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && box && !box.hidden) { e.stopImmediatePropagation(); closeBox(); }
  }, true);

  /* ---------- Student Leaders ---------- */
  function renderLeaders(data) {
    var grid = document.getElementById("pp-grid");
    var people = (data && data.leaders) || [];
    if (!grid) return;
    if (!people.length) {
      grid.innerHTML = '<div class="coming-soon"><h3>Leaders will be listed soon</h3></div>';
      return;
    }
    grid.innerHTML = people.map(function (p) {
      return '<article class="pp-card leader-card">' +
        photo(p.photo, p.name, "leader-photo") +
        '<div class="leader-body">' +
          '<p class="leader-post">' + esc(p.post) + "</p>" +
          "<h3>" + esc(p.name) + "</h3>" +
          (list(p.duty).filter(Boolean).length ? '<div class="leader-duty">' + paras(p.duty) + "</div>" : "") +
        "</div></article>";
    }).join("");
    setDelays(grid);
  }

  /* ---------- Contacts (shared by fellowships and units) ---------- */
  function contactRows(l) {
    var rows = [];
    if (l.phone) {
      rows.push('<li><a href="tel:' + attr(text(l.phone).replace(/[^\d+]/g, "")) + '"><span class="pp-c-label">Phone</span><span class="pp-c-value">' + esc(l.phone) + "</span></a></li>");
    }
    var wa = text(l.whatsapp).replace(/\D/g, "");
    /* Nigerian numbers written as 0806... need the country code for WhatsApp links */
    if (/^0\d{10}$/.test(wa)) wa = "234" + wa.slice(1);
    if (wa) {
      rows.push('<li><a href="https://wa.me/' + wa + '" target="_blank" rel="noopener"><span class="pp-c-label">WhatsApp</span><span class="pp-c-value">Chat on WhatsApp</span></a></li>');
    }
    if (l.email) {
      rows.push('<li><a href="mailto:' + attr(l.email) + '"><span class="pp-c-label">Email</span><span class="pp-c-value">' + esc(l.email) + "</span></a></li>");
    }
    return rows.length
      ? '<ul class="pp-contacts">' + rows.join("") + "</ul>"
      : '<p class="pp-nocontact">Contact details will be added soon.</p>';
  }

  /* ---------- Fellowships ---------- */
  function renderFellowships(data) {
    var grid = document.getElementById("pp-grid");
    var items = (data && data.fellowships) || [];
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '<div class="coming-soon"><h3>Fellowships will be listed soon</h3></div>';
      return;
    }
    grid.innerHTML = items.map(function (f, i) {
      var l = f.leader || {};
      return '<article class="pp-card fellowship-card">' +
        photo(l.photo, l.name, "fellowship-photo") +
        "<h3>" + esc(f.name) + "</h3>" +
        (f.tagline ? '<p class="fellowship-tagline">' + esc(f.tagline) + "</p>" : "") +
        '<p class="fellowship-leader"><span>' + esc(l.title || "Fellowship Leader") + "</span>" + esc(l.name) + "</p>" +
        '<button class="btn btn-navy btn-small" type="button" data-fellowship="' + i + '">View Profile</button>' +
      "</article>";
    }).join("");
    setDelays(grid);

    grid.addEventListener("click", function (e) {
      var b = e.target.closest("[data-fellowship]");
      if (!b) return;
      var f = items[Number(b.getAttribute("data-fellowship"))];
      var l = f.leader || {};
      var meets = f.meets ? '<div class="modal-meta"><span>' + esc(f.meets) + "</span></div>" : "";
      openModal({
        eyebrow: f.name,
        title: l.name || "Fellowship Leader",
        html:
          '<div class="pp-profile">' + fullPhoto(l.photo, l.name) +
          '<p class="pp-profile-role">' + esc(l.title || "Fellowship Leader") + "</p></div>" +
          meets +
          '<h4 class="pp-sub">Contact</h4>' + contactRows(l) +
          (l.bio ? '<h4 class="pp-sub">About</h4>' + paras(l.bio) : "")
      });
    });
  }

  /* ---------- Units ---------- */
  function personBlock(p, fallbackTitle) {
    return '<section class="pp-person">' +
      '<div class="pp-profile">' + fullPhoto(p.photo, p.name) +
      '<h3 class="pp-person-name">' + esc(p.name || "To be announced") + "</h3>" +
      '<p class="pp-profile-role">' + esc(p.title || fallbackTitle) + "</p></div>" +
      contactRows(p) +
      (p.bio ? paras(p.bio) : "") +
      "</section>";
  }

  function renderUnits(data) {
    var grid = document.getElementById("pp-grid");
    var items = (data && data.units) || [];
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '<div class="coming-soon"><h3>Units will be listed soon</h3></div>';
      return;
    }
    grid.innerHTML = items.map(function (u, i) {
      var l = u.leader || {}, a = u.assistant;
      var img = u.image
        ? '<img src="' + attr(u.image) + '" alt="' + attr(u.name) + '" loading="lazy" onerror="this.remove()">' : "";
      return '<article class="pp-card unit-card">' +
        '<div class="pp-photo unit-photo' + (u.image ? " is-zoomable" : "") + '"><span class="pp-initials" aria-hidden="true">' + esc(initials(u.name)) + "</span>" + img + "</div>" +
        '<div class="unit-body">' +
          "<h3>" + esc(u.name) + "</h3>" +
          '<p class="unit-intro">' + esc(u.intro) + "</p>" +
          '<ul class="unit-leaders">' +
            "<li><span>" + esc(l.title || "Unit Leader") + "</span>" + esc(l.name || "To be announced") + "</li>" +
            (a ? "<li><span>" + esc(a.title || "Assistant Leader") + "</span>" + esc(a.name || "To be announced") + "</li>" : "") +
          "</ul>" +
          '<button class="btn btn-navy btn-small" type="button" data-unit="' + i + '">View Profile</button>' +
        "</div></article>";
    }).join("");
    setDelays(grid);

    grid.addEventListener("click", function (e) {
      var b = e.target.closest("[data-unit]");
      if (!b) return;
      var u = items[Number(b.getAttribute("data-unit"))];
      var duties = list(u.duties).filter(Boolean);
      openModal({
        eyebrow: "Unit",
        title: u.name,
        html:
          (u.intro ? "<p>" + esc(u.intro) + "</p>" : "") +
          (duties.length ? '<h4 class="pp-sub">Duties</h4><ul class="pp-duties">' + duties.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>" : "") +
          '<h4 class="pp-sub">' + (u.assistant ? "Leader &amp; Assistant" : "Unit Leader") + "</h4>" +
          '<div class="pp-people">' + personBlock(u.leader || {}, "Unit Leader") +
          (u.assistant ? personBlock(u.assistant, "Assistant Leader") : "") + "</div>"
      });
    });
  }

  if (page === "student") load("data/leaders.json", renderLeaders);
  else if (page === "units") load("data/units.json", renderUnits);
  else load("data/fellowships.json", renderFellowships);
})();
