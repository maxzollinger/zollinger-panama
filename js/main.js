/* ============================================================
   Zollinger Panama Real Estate — main.js
   Vanilla JS. No frameworks.

   CONFIG — change contact info / defaults here, nowhere else.
   ============================================================ */
const CONFIG = {
  email: "info@zollinger-panama.com",
  phone: "+507 0000-0000",
  whatsapp: "+50700000000", // digits only used for wa.me, display uses phone
  defaultLang: "es",
  supportedLangs: ["es", "en", "de"],
  // Hook point: replace mailto handling with Formspree / CRM later.
  // When set, form will POST here instead of opening mailto.
  formEndpoint: null, // e.g. "https://formspree.io/f/XXXXX"
  mapQuery: "Santa+Maria+Golf+and+Country+Club+Panama"
};

/* --------------- i18n --------------- */
const I18N = window.ZOLL_I18N;
const LS_KEY = "zoll.lang";

function detectLang() {
  const stored = localStorage.getItem(LS_KEY);
  if (stored && CONFIG.supportedLangs.includes(stored)) return stored;
  const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
  if (nav.startsWith("de")) return "de";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return CONFIG.defaultLang;
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function formatPrice(n, lang) {
  // es: US$535.000  en: US$535,000  de: 535.000 US$
  if (lang === "de") {
    return `${n.toLocaleString("de-DE")} US$`;
  } else if (lang === "en") {
    return `US$${n.toLocaleString("en-US")}`;
  }
  return `US$${n.toLocaleString("de-DE")}`; // es: dot thousands
}

function auditTranslations() {
  // Verify every key present in default is present in every supported lang.
  const base = I18N[CONFIG.defaultLang];
  function walk(obj, path) {
    if (obj == null) return;
    if (typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const k of Object.keys(obj)) {
      const sub = `${path ? path + "." : ""}${k}`;
      for (const lang of CONFIG.supportedLangs) {
        if (lang === CONFIG.defaultLang) continue;
        const v = getByPath(I18N[lang], sub);
        if (v === undefined) {
          console.warn(`[i18n] Missing key for ${lang}: ${sub}`);
        }
      }
      walk(obj[k], sub);
    }
  }
  walk(base, "");
}

function applyI18n(lang) {
  const dict = I18N[lang];
  if (!dict) return;

  // <html lang="">
  document.documentElement.lang = dict.meta.lang_code;

  // <title> + meta description
  document.title = dict.meta.title;
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute("content", dict.meta.description);
  const ogt = document.querySelector('meta[property="og:title"]');
  if (ogt) ogt.setAttribute("content", dict.meta.title);
  const ogd = document.querySelector('meta[property="og:description"]');
  if (ogd) ogd.setAttribute("content", dict.meta.description);
  const ogl = document.querySelector('meta[property="og:locale"]');
  if (ogl) ogl.setAttribute("content", dict.meta.lang_code.replace("-", "_"));

  // text nodes
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const v = getByPath(dict, key);
    if (typeof v === "string") el.textContent = v;
  });

  // attribute translations: data-i18n-attr="placeholder:form.name_ph,aria-label:nav.open_menu"
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const spec = el.getAttribute("data-i18n-attr");
    spec.split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      const v = getByPath(dict, key);
      if (typeof v === "string") el.setAttribute(attr, v);
    });
  });

  // dynamic sections
  renderResidenceCards(dict, lang);
  renderCompareTable(dict, lang);
  renderAmenities(dict);
  renderDistances(dict);
  renderInvestment(dict);
  renderTimeline(dict);
  renderFaq(dict);
  renderFooterLinks(dict);
  updateWhatsappLink(lang);
  updateLangSwitchers(lang);

  // forms: option labels & placeholders handled above; re-apply if any input needs it
  const privacy = document.getElementById("f-privacy-label");
  if (privacy) privacy.textContent = dict.contact.form.privacy;
}

/* --------------- renderers --------------- */
function renderResidenceCards(dict, lang) {
  const container = document.getElementById("residence-cards");
  if (!container) return;
  const order = ["residence", "penthouse", "townhome"];
  container.innerHTML = order
    .map((key, i) => {
      const m = dict.models[key];
      const img = CARD_IMAGES[key];
      const anchorId =
        key === "residence"
          ? "residences-tile"
          : key === "penthouse"
          ? "penthouses"
          : "townhomes";
      return `
        <article class="tile tile--product reveal" id="${anchorId}" data-model="${key}">
          <div class="tile__text">
            <p class="eyebrow">${m.name}</p>
            <h2 class="tile__title">${m.tagline}</h2>
            <p class="tile__price"><span class="price-label">${m.price_from}</span> <span class="price-value">${formatPrice(
        m.price,
        lang
      )}</span></p>
            <div class="tile__ctas">
              <button class="pill-link pill-link--primary" data-open-model="${key}">${m.cta} ›</button>
              <a class="pill-link" href="#contact" data-request-model="${key}">${dict.compare.cta} ›</a>
            </div>
          </div>
          <div class="tile__media">
            <picture>
              <source srcset="${img.src}&w=1600" media="(min-width: 1024px)">
              <source srcset="${img.src}&w=1000" media="(min-width: 600px)">
              <img src="${img.src}&w=800" alt="${img.alt[lang]}" loading="lazy" width="1600" height="1066">
            </picture>
          </div>
        </article>`;
    })
    .join("");

  // bind buttons
  container.querySelectorAll("[data-open-model]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      openModelModal(btn.getAttribute("data-open-model"));
    });
  });
  container.querySelectorAll("[data-request-model]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-request-model");
      const sel = document.getElementById("f-model");
      if (sel) sel.value = key;
    });
  });

  // Re-observe reveal elements for the newly created cards
  observeReveals();
}

function renderCompareTable(dict, lang) {
  const el = document.getElementById("compare-body");
  if (!el) return;
  const m = dict.models;
  const c = dict.compare;
  const rows = [
    [c.col_price, formatPrice(m.residence.price, lang), formatPrice(m.penthouse.price, lang), formatPrice(m.townhome.price, lang)],
    [c.col_beds, "2", "3", "3"],
    [c.col_baths, "2", "3", "3,5"],
    [c.col_area, m.residence.area, m.penthouse.area, m.townhome.area],
    [c.col_levels, "1", "1", "2"],
    [c.col_closet, c.yes, c.yes, c.yes],
    [c.col_service, c.yes, c.yes, c.no],
    [c.col_den, c.no, c.no, c.yes]
  ];
  el.innerHTML = rows
    .map(
      (r) => `
        <tr>
          <th scope="row">${r[0]}</th>
          <td>${r[1]}</td>
          <td>${r[2]}</td>
          <td>${r[3]}</td>
        </tr>`
    )
    .join("");

  const head = document.getElementById("compare-head");
  if (head) {
    head.innerHTML = `
      <tr>
        <th scope="col">${c.col_feature}</th>
        <th scope="col">${m.residence.name}</th>
        <th scope="col">${m.penthouse.name}</th>
        <th scope="col">${m.townhome.name}</th>
      </tr>`;
  }
}

function renderAmenities(dict) {
  const grid = document.getElementById("amenities-grid");
  if (!grid) return;
  const items = dict.amenities.list;
  grid.innerHTML = items
    .map((label, i) => {
      const icon = AMENITY_ICONS[i % AMENITY_ICONS.length];
      return `
        <div class="amenity ${i >= 12 ? "amenity--extra" : ""}">
          <span class="amenity__icon" aria-hidden="true">${icon}</span>
          <span class="amenity__label">${label}</span>
        </div>`;
    })
    .join("");
  grid.setAttribute("data-expanded", "false");
}

function renderDistances(dict) {
  const el = document.getElementById("distances-grid");
  if (!el) return;
  el.innerHTML = dict.location.distances
    .map(
      (d) => `
        <div class="distance">
          <p class="distance__time">${d.time}</p>
          <p class="distance__place">${d.place}</p>
        </div>`
    )
    .join("");
}

function renderInvestment(dict) {
  const el = document.getElementById("invest-grid");
  if (!el) return;
  el.innerHTML = dict.investment.stats
    .map(
      (s) => `
        <div class="stat reveal">
          <p class="stat__k">${s.k}</p>
          <p class="stat__v">${s.v}</p>
          <p class="stat__d">${s.d}</p>
        </div>`
    )
    .join("");
  observeReveals();
}

function renderTimeline(dict) {
  const el = document.getElementById("timeline-grid");
  if (!el) return;
  el.innerHTML = dict.about.timeline
    .map(
      (s) => `
        <div class="step reveal">
          <p class="step__k">${s.k}</p>
          <h3 class="step__t">${s.t}</h3>
          <p class="step__d">${s.d}</p>
        </div>`
    )
    .join("");
  observeReveals();
}

function renderFaq(dict) {
  const el = document.getElementById("faq-list");
  if (!el) return;
  el.innerHTML = dict.faq.items
    .map(
      (q, i) => `
        <details class="faq__item">
          <summary>
            <span>${q.q}</span>
            <span class="faq__plus" aria-hidden="true">+</span>
          </summary>
          <div class="faq__body"><p>${q.a}</p></div>
        </details>`
    )
    .join("");
}

function renderFooterLinks(dict) {
  const f = dict.footer;
  const map = {
    "foot-residences": [
      ["#residences-tile", f.link_residences],
      ["#penthouses", f.link_penthouses],
      ["#townhomes", f.link_townhomes],
      ["#amenities", f.link_amenities]
    ],
    "foot-company": [
      ["#about", f.link_about],
      ["#", f.link_news],
      ["#", f.link_careers]
    ],
    "foot-investment": [
      ["#investment", f.link_invest],
      ["#investment", f.link_residency],
      ["#contact", f.link_financing]
    ],
    "foot-contact": [
      ["#contact", f.link_contact],
      ["#contact", f.link_schedule],
      [waLink(getCurrentLang()), f.link_whatsapp]
    ],
    "foot-legal": [
      ["#legal-privacy", f.link_privacy],
      ["#legal-terms", f.link_terms],
      ["#legal-cookies", f.link_cookies]
    ]
  };
  for (const id of Object.keys(map)) {
    const ul = document.getElementById(id);
    if (!ul) continue;
    ul.innerHTML = map[id]
      .map(([href, label]) => `<li><a href="${href}">${label}</a></li>`)
      .join("");
  }
}

function updateLangSwitchers(lang) {
  document.querySelectorAll("[data-lang-switch]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-lang-switch") === lang);
    btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang-switch") === lang));
  });
  const footerLabel = document.getElementById("footer-lang-label");
  if (footerLabel) footerLabel.textContent = I18N[lang].meta.lang_label;
}

/* --------------- language state --------------- */
function getCurrentLang() {
  return document.documentElement.getAttribute("data-lang") || CONFIG.defaultLang;
}
function setLang(lang) {
  if (!CONFIG.supportedLangs.includes(lang)) return;
  document.documentElement.setAttribute("data-lang", lang);
  localStorage.setItem(LS_KEY, lang);
  applyI18n(lang);
}

/* --------------- images --------------- */
// Base Unsplash URLs — see README.md to swap for your own renders.
const U = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80`;

const CARD_IMAGES = {
  residence: {
    src: U("photo-1600596542815-ffad4c1539a9"),
    alt: {
      es: "Interior luminoso de residencia de lujo con amplios ventanales",
      en: "Bright interior of a luxury residence with floor-to-ceiling windows",
      de: "Helles Interieur einer Luxusresidenz mit raumhohen Fenstern"
    }
  },
  penthouse: {
    src: U("photo-1600210492486-724fe5c67fb0"),
    alt: {
      es: "Penthouse con terraza panorámica al atardecer",
      en: "Penthouse with panoramic terrace at sunset",
      de: "Penthouse mit Panorama-Terrasse im Sonnenuntergang"
    }
  },
  townhome: {
    src: U("photo-1613977257592-4a9a32f9141d"),
    alt: {
      es: "Townhome moderno con jardín privado y arquitectura minimalista",
      en: "Modern townhome with private garden and minimalist architecture",
      de: "Modernes Townhome mit privatem Garten und minimalistischer Architektur"
    }
  }
};

const HERO_IMG = U("photo-1507525428034-b723cf961d3e");
const INTRO_IMG = U("photo-1613490493576-7fde63acd811");
const AMENITIES_IMG = U("photo-1571896349842-33c89424de2d");
const LOCATION_IMG = U("photo-1506929562872-bb421503ef21");
const INVEST_IMG = U("photo-1577995201316-cd0a9eb3eca4");
const ABOUT_IMG = U("photo-1512917774080-9991f1c4c750");
const GALLERY_IMGS = [
  U("photo-1613977257363-707ba9348227"),
  U("photo-1600566753376-12c8ab7fb75b"),
  U("photo-1540541338287-41700207dee6"),
  U("photo-1600607687939-ce8a6c25118c"),
  U("photo-1600585154526-990dced4db0d"),
  U("photo-1512917774080-9991f1c4c750"),
  U("photo-1600047509807-ba8f99d2cdde"),
  U("photo-1613977257363-707ba9348227")
];

/* --------------- amenity icons (inline SVG) --------------- */
const AMENITY_ICONS = [
  // pool / wave
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 15c2 0 2 1.5 4 1.5s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5"/><path d="M2 19c2 0 2 1.5 4 1.5s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5"/><circle cx="12" cy="7" r="2"/></svg>',
  // dumbbell
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9v6M5 7v10M19 7v10M21 9v6M5 12h14"/></svg>',
  // bike
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l3-7h5l3 7M9 10L7 7h-2M14 10l1-3h3"/></svg>',
  // leaf
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 19c0-8 7-14 15-14 0 8-6 15-15 15z"/><path d="M5 19c3-3 6-6 10-9"/></svg>',
  // wine glass
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3h8v4a4 4 0 01-8 0V3zM12 11v9M8 20h8"/></svg>',
  // flame
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3s4 4 4 8a4 4 0 11-8 0c0-2 1-3 2-4-1 3 2 4 2 1 0-2 0-3 0-5z"/></svg>',
  // laptop
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
  // chat bubble
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 5h16v11H8l-4 4V5z"/></svg>',
  // kid / smile
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10.5" r=".8" fill="currentColor"/><circle cx="15" cy="10.5" r=".8" fill="currentColor"/><path d="M9 15c1 1 5 1 6 0"/></svg>',
  // paw
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="7" r="1.8"/><circle cx="14" cy="7" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8 15c0-2 2-3 4-3s4 1 4 3-2 5-4 5-4-3-4-5z"/></svg>',
  // lock / security
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  // sparkle (spa)
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></svg>',
  // sun
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2"/></svg>',
  // film / cinema
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 15h18M7 4v16M17 4v16"/></svg>',
  // flag / concierge
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3v18"/><path d="M5 4h12l-2 4 2 4H5"/></svg>',
  // plug / EV
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3v5M15 3v5"/><rect x="7" y="8" width="10" height="7" rx="1.5"/><path d="M12 15v3a3 3 0 003 3h1"/></svg>',
  // golf
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v14"/><path d="M12 7l6-2-6-2"/><ellipse cx="12" cy="20" rx="6" ry="1.5"/></svg>',
  // tree
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/></svg>',
  // running
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="15" cy="5" r="1.8"/><path d="M8 20l4-5 2 3 3-2M6 11l3-3 3 3 3-1"/></svg>',
  // beach umbrella
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4c5 0 9 4 9 8H3c0-4 4-8 9-8z"/><path d="M12 4v16"/></svg>',
  // building
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>',
  // music / party
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/></svg>',
  // bath
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11h18v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3zM7 11V6a2 2 0 014 0"/></svg>',
  // hammock
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7l16 10M4 7c6 4 10 4 16 10M2 5h4M18 15h4"/></svg>',
  // target / paddle
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  // flag green putting
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3v18"/><path d="M6 3h12l-3 4 3 4H6"/></svg>',
  // monitor / simulator
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>',
  // briefcase
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="12" rx="1.5"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>',
  // book
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 5a2 2 0 012-2h7v18H6a2 2 0 01-2-2V5zM13 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5"/></svg>',
  // armchair
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11a2 2 0 014 0v4h8v-4a2 2 0 014 0v6H4z"/><path d="M6 17v3M18 17v3"/></svg>',
  // glass / juice
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 4h10l-1 16H8z"/><path d="M8 10h8"/></svg>',
  // umbrella (bar)
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11a9 9 0 0118 0z"/><path d="M12 11v9M12 20a2 2 0 002-2"/></svg>',
  // playground / slide
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 20l8-10 4 2 6-2"/><circle cx="19" cy="7" r="2"/></svg>',
  // fire pit
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4s4 3 4 7a4 4 0 11-8 0c0-2 2-4 4-7z"/><path d="M4 20h16"/></svg>',
  // binoculars / lookout
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 16V8h2v8M13 16V8h2v8M11 8l1-3h0l1 3"/></svg>',
  // dog
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10l2-4 3 2h6l3-2 2 4-2 2v6H6v-6z"/><circle cx="10" cy="14" r=".7" fill="currentColor"/><circle cx="14" cy="14" r=".7" fill="currentColor"/></svg>',
  // locker / box
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/></svg>',
  // yoga / lotus
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="6" r="2"/><path d="M12 9v4M8 20c0-3 2-5 4-5s4 2 4 5M4 18c3-2 5-2 8-2M20 18c-3-2-5-2-8-2"/></svg>',
  // meeting / users
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3 2-5 5-5s5 2 5 5M13 20c0-2 2-4 4-4s4 2 4 4"/></svg>',
  // steam
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 10c2-3 4-3 6 0s4 3 6 0M6 15c2-3 4-3 6 0s4 3 6 0M6 20c2-3 4-3 6 0s4 3 6 0"/></svg>',
  // games controller
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9h12a3 3 0 013 3v4a2 2 0 01-2 2c-1 0-2-1-3-2h-10c-1 1-2 2-3 2a2 2 0 01-2-2v-4a3 3 0 013-3z"/><path d="M8 12v2M7 13h2M15 13h.01M17 14h.01"/></svg>',
  // tent / rooftop
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 20L12 4l9 16H3z"/><path d="M12 4v16"/></svg>'
];

/* --------------- modal --------------- */
function openModelModal(key) {
  const dict = I18N[getCurrentLang()];
  const m = dict.models[key];
  const lang = getCurrentLang();

  const modal = document.getElementById("model-modal");
  modal.setAttribute("aria-hidden", "false");
  modal.setAttribute("data-model", key);
  document.body.style.overflow = "hidden";

  modal.querySelector("[data-m-name]").textContent = m.name;
  modal.querySelector("[data-m-tagline]").textContent = m.tagline;
  modal.querySelector("[data-m-price]").textContent = `${m.price_from} ${formatPrice(m.price, lang)}`;
  modal.querySelector("[data-m-features-title]").textContent = dict.modal.features_title;
  modal.querySelector("[data-m-floorplan-title]").textContent = dict.modal.floorplan_title;
  modal.querySelector("[data-m-floorplan-ph]").textContent = dict.modal.floorplan_placeholder;
  modal.querySelector("[data-m-cta]").textContent = dict.modal.cta;
  modal.querySelector("[data-m-close]").setAttribute("aria-label", dict.modal.close);

  const img = modal.querySelector("[data-m-img]");
  img.src = `${CARD_IMAGES[key].src}&w=1600`;
  img.alt = CARD_IMAGES[key].alt[lang];

  const list = modal.querySelector("[data-m-features]");
  list.innerHTML = m.features.map((f) => `<li>${f}</li>`).join("");
}

function closeModal() {
  const modal = document.getElementById("model-modal");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* --------------- whatsapp --------------- */
function waLink(lang) {
  const digits = CONFIG.whatsapp.replace(/[^0-9]/g, "");
  const text = encodeURIComponent(I18N[lang].whatsapp.prefill);
  return `https://wa.me/${digits}?text=${text}`;
}
function updateWhatsappLink(lang) {
  const btn = document.getElementById("wa-float");
  if (btn) {
    btn.href = waLink(lang);
    btn.setAttribute("aria-label", I18N[lang].whatsapp.aria);
  }
}

/* --------------- nav & scroll --------------- */
function initNav() {
  const toggle = document.getElementById("menu-toggle");
  const overlay = document.getElementById("menu-overlay");
  if (!toggle || !overlay) return;

  toggle.addEventListener("click", () => {
    const open = overlay.classList.toggle("is-open");
    document.body.style.overflow = open ? "hidden" : "";
    toggle.setAttribute("aria-expanded", String(open));
  });

  overlay.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Shrink nav on scroll
  const bar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) bar.classList.add("is-scrolled");
    else bar.classList.remove("is-scrolled");
  }, { passive: true });

  // Smooth scroll — handled by CSS; add offset accounting for sticky bar
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.pageYOffset - 56;
      window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  });
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* reveal-on-scroll */
let revealObserver;
function observeReveals() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
  }
  document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) =>
    revealObserver.observe(el)
  );
}

/* hero parallax */
function initParallax() {
  if (prefersReducedMotion()) return;
  const el = document.querySelector("[data-parallax]");
  if (!el) return;
  window.addEventListener(
    "scroll",
    () => {
      const y = Math.min(window.scrollY * 0.3, 300);
      el.style.transform = `translate3d(0, ${y}px, 0) scale(1.05)`;
    },
    { passive: true }
  );
}

/* --------------- gallery carousel --------------- */
function initGallery() {
  const track = document.getElementById("gallery-track");
  if (!track) return;
  track.innerHTML = GALLERY_IMGS.map(
    (src, i) => `
      <li class="gallery__slide" data-slide="${i}">
        <img src="${src}&w=1400" alt="" loading="lazy">
      </li>`
  ).join("");

  const prev = document.getElementById("gallery-prev");
  const next = document.getElementById("gallery-next");
  const dotsEl = document.getElementById("gallery-dots");
  dotsEl.innerHTML = GALLERY_IMGS.map(
    (_, i) => `<button class="gallery__dot" data-dot="${i}" aria-label="${I18N[getCurrentLang()].gallery.slide_label} ${i + 1}"></button>`
  ).join("");

  const slides = Array.from(track.children);
  function scrollTo(i) {
    const target = slides[Math.max(0, Math.min(slides.length - 1, i))];
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
  }
  let current = 0;
  prev.addEventListener("click", () => scrollTo(--current));
  next.addEventListener("click", () => scrollTo(++current));

  dotsEl.querySelectorAll("[data-dot]").forEach((d) =>
    d.addEventListener("click", () => {
      current = parseInt(d.getAttribute("data-dot"), 10);
      scrollTo(current);
    })
  );

  // sync dots as user scrolls
  track.addEventListener("scroll", () => {
    const index = Math.round(track.scrollLeft / track.clientWidth);
    current = index;
    dotsEl.querySelectorAll(".gallery__dot").forEach((d, i) =>
      d.classList.toggle("is-active", i === index)
    );
  }, { passive: true });
}

/* --------------- amenities expand --------------- */
function initAmenities() {
  const toggle = document.getElementById("amenities-toggle");
  const grid = document.getElementById("amenities-grid");
  if (!toggle || !grid) return;
  toggle.addEventListener("click", () => {
    const expanded = grid.getAttribute("data-expanded") === "true";
    grid.setAttribute("data-expanded", String(!expanded));
    const dict = I18N[getCurrentLang()];
    toggle.textContent = (expanded ? dict.amenities.expand : dict.amenities.collapse) + " ›";
  });
}

/* --------------- form --------------- */
function initForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dict = I18N[getCurrentLang()];
    const f = dict.contact.form;

    // clear old errors
    form.querySelectorAll(".field__error").forEach((el) => (el.textContent = ""));
    form.querySelectorAll(".field.is-invalid").forEach((el) => el.classList.remove("is-invalid"));

    let valid = true;
    const required = ["f-name", "f-email", "f-message"];
    required.forEach((id) => {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        setFieldError(el, f.err_required);
        valid = false;
      }
    });
    const email = document.getElementById("f-email");
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setFieldError(email, f.err_email);
      valid = false;
    }
    const privacy = document.getElementById("f-privacy");
    if (!privacy.checked) {
      setFieldError(privacy, f.err_privacy);
      valid = false;
    }

    if (!valid) return;

    const data = {
      name: document.getElementById("f-name").value.trim(),
      email: document.getElementById("f-email").value.trim(),
      phone: document.getElementById("f-phone").value.trim(),
      language: document.getElementById("f-language").value,
      model: document.getElementById("f-model").value,
      budget: document.getElementById("f-budget").value,
      message: document.getElementById("f-message").value.trim()
    };

    if (CONFIG.formEndpoint) {
      // Hook: swap to Formspree/CRM here.
      fetch(CONFIG.formEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).catch(() => {});
    } else {
      // mailto fallback — pre-filled
      const subject = encodeURIComponent(`[Zollinger Panama] ${data.name} — ${data.model || "—"}`);
      const bodyLines = [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone}`,
        `Language: ${data.language}`,
        `Model: ${data.model}`,
        `Budget: ${data.budget}`,
        "",
        data.message
      ];
      const body = encodeURIComponent(bodyLines.join("\n"));
      window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
    }

    const success = document.getElementById("form-success");
    success.textContent = f.success;
    success.classList.add("is-visible");
    form.reset();
    setTimeout(() => success.classList.remove("is-visible"), 6000);
  });
}
function setFieldError(el, msg) {
  const field = el.closest(".field");
  if (!field) return;
  field.classList.add("is-invalid");
  const err = field.querySelector(".field__error");
  if (err) err.textContent = msg;
}

/* --------------- lang switcher --------------- */
function initLangSwitchers() {
  document.querySelectorAll("[data-lang-switch]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLang(btn.getAttribute("data-lang-switch"));
    });
  });
}

/* --------------- legal modals --------------- */
function initLegalModals() {
  document.querySelectorAll('[href^="#legal-"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const which = a.getAttribute("href").replace("#legal-", "");
      openLegal(which);
    });
  });
  const modal = document.getElementById("legal-modal");
  modal.querySelector("[data-legal-close]").addEventListener("click", closeLegal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeLegal();
  });
}
function openLegal(which) {
  const dict = I18N[getCurrentLang()].legal;
  const key = which === "privacy" ? "privacy" : which === "terms" ? "terms" : "cookies";
  document.getElementById("legal-title").textContent = dict[`${key}_title`];
  document.getElementById("legal-body").innerHTML = `<p>${dict[`${key}_body`]}</p>`;
  const modal = document.getElementById("legal-modal");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeLegal() {
  document.getElementById("legal-modal").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* --------------- static image placement --------------- */
function placeStaticImages() {
  const map = {
    "img-hero": [HERO_IMG, "hero"],
    "img-intro": [INTRO_IMG, "intro"],
    "img-amenities": [AMENITIES_IMG, "amenities"],
    "img-location": [LOCATION_IMG, "location"],
    "img-invest": [INVEST_IMG, "invest"],
    "img-about": [ABOUT_IMG, "about"]
  };
  for (const id of Object.keys(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const [src] = map[id];
    el.src = `${src}&w=2000`;
  }
}

/* --------------- init --------------- */
document.addEventListener("DOMContentLoaded", () => {
  auditTranslations();
  placeStaticImages();
  const lang = detectLang();
  document.documentElement.setAttribute("data-lang", lang);
  applyI18n(lang);

  initNav();
  initLangSwitchers();
  initAmenities();
  initGallery();
  initForm();
  initLegalModals();
  initParallax();
  observeReveals();

  // modal close
  const modal = document.getElementById("model-modal");
  modal.querySelector("[data-m-close]").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  modal.querySelector("[data-m-cta]").addEventListener("click", () => {
    const key = modal.getAttribute("data-model");
    const sel = document.getElementById("f-model");
    if (sel && key) sel.value = key;
    closeModal();
    const y = document.getElementById("contact").getBoundingClientRect().top + window.pageYOffset - 56;
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeLegal();
    }
  });
});
