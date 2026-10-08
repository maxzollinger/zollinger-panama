# Zollinger Panama Real Estate — site

Static one-page site. Plain HTML/CSS/JS. No build step.

## Live site

**https://maxzollinger.github.io/zollinger-panama/**

Hosted on GitHub Pages — accessible worldwide on any browser (desktop, iPhone Safari, Android, etc.). Every push to `main` auto-deploys in ~30–60 seconds.

### Publish an edit

Edit any file, then:

```bash
cd ~/zollinger-panama
git add .
git commit -m "Update: whatever changed"
git push
```

Within ~30s the new version is live for every device in the world. Hard-refresh (⌘+Shift+R on Mac, Ctrl+F5 on Windows) if the browser cache serves the old version.

To see the deploy progress: https://github.com/maxzollinger/zollinger-panama/actions

## Run locally (optional)

Double-click `index.html` — or from Git Bash:

```bash
start chrome "$(pwd -W)/index.html"
# or just
start index.html
```

A local server also works (nothing requires it, but it avoids any `file://` quirks):

```bash
# Python 3
python -m http.server 8080
# then: http://localhost:8080
```

## File map

```
zollinger-panama/
├── index.html        # structure, data-i18n markers, SEO meta, JSON-LD
├── css/styles.css    # all styles (one file, token-driven)
├── js/i18n.js        # single translation object for es / en / de
├── js/main.js        # CONFIG at top, i18n engine, interactions, images
├── assets/
│   ├── logo.svg      # wordmark used in nav / footer
│   └── favicon.svg   # browser tab icon
└── README.md
```

## Edit contact info / email / phone / WhatsApp

Change **once**, at the top of `js/main.js`:

```js
const CONFIG = {
  email: "info@zollinger-panama.com",
  phone: "+507 0000-0000",
  whatsapp: "+50700000000", // digits only — used in wa.me URL
  defaultLang: "es",
  supportedLangs: ["es", "en", "de"],
  formEndpoint: null, // set to Formspree URL to swap from mailto
  mapQuery: "Santa+Maria+Golf+and+Country+Club+Panama"
};
```

## Edit copy / prices

All text lives in `js/i18n.js` under three keys: `es`, `en`, `de`.

- **Prices** → `models.residence.price`, `models.penthouse.price`, `models.townhome.price` (numbers; formatting is handled per language automatically).
- **Residence features** → `models.<model>.features` (array of strings).
- **Amenities** → `amenities.list` (array of 42 strings).
- **FAQ** → `faq.items` (array of `{ q, a }`).
- **Distances** → `location.distances` (array of `{ place, time }`).
- **Investment stats** → `investment.stats` (array of `{ k, v, d }`).
- **Timeline** → `about.timeline` (3 steps).

Any string missing in `en` or `de` is logged with `console.warn` on load so you can spot gaps quickly.

## Swap images

All image URLs are grouped in `js/main.js`:

- `HERO_IMG`, `INTRO_IMG`, `AMENITIES_IMG`, `LOCATION_IMG`, `INVEST_IMG`, `ABOUT_IMG`
- `CARD_IMAGES.residence / penthouse / townhome` (object with `src` + alt text per language)
- `GALLERY_IMGS` (array)

The `U(id)` helper builds Unsplash URLs with `?auto=format&fit=crop&q=80`. For your own renders, just replace the string with any URL (or a local `./assets/img/your-render.jpg`). Every image sits on a CSS gradient background so it still looks good if a URL fails.

### Current Unsplash URLs (replace with your renders)

| Slot | ID / URL |
|---|---|
| Hero (ocean/coast) | https://images.unsplash.com/photo-1507525428034-b723cf961d3e |
| Intro | https://images.unsplash.com/photo-1613490493576-7fde63acd811 |
| Residences card | https://images.unsplash.com/photo-1600596542815-ffad4c1539a9 |
| Penthouses card | https://images.unsplash.com/photo-1600210492486-724fe5c67fb0 |
| Townhomes card | https://images.unsplash.com/photo-1613977257592-4a9a32f9141d |
| Amenities (pool) | https://images.unsplash.com/photo-1571896349842-33c89424de2d |
| Location (aerial) | https://images.unsplash.com/photo-1506929562872-bb421503ef21 |
| Investment (city) | https://images.unsplash.com/photo-1577995201316-cd0a9eb3eca4 |
| About | https://images.unsplash.com/photo-1512917774080-9991f1c4c750 |
| Gallery 1 | https://images.unsplash.com/photo-1613977257363-707ba9348227 |
| Gallery 2 | https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b |
| Gallery 3 | https://images.unsplash.com/photo-1540541338287-41700207dee6 |
| Gallery 4 | https://images.unsplash.com/photo-1600607687939-ce8a6c25118c |
| Gallery 5 | https://images.unsplash.com/photo-1600585154526-990dced4db0d |
| Gallery 6 | https://images.unsplash.com/photo-1512917774080-9991f1c4c750 |
| Gallery 7 | https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde |
| Gallery 8 | https://images.unsplash.com/photo-1613977257363-707ba9348227 |

Append `&w=1600&q=80&auto=format&fit=crop` for a specific width.

## Add a language

1. In `js/i18n.js`, duplicate the whole `en: { … }` block and translate values. Pick a code like `fr`.
2. In `js/main.js`, add it to `CONFIG.supportedLangs`:
   ```js
   supportedLangs: ["es", "en", "de", "fr"]
   ```
3. In `index.html`, add two `<button data-lang-switch="fr">FR</button>` entries (nav + footer).

The console will warn on any key missing in the new language — fix those, done.

## Form

Right now the form opens a pre-filled `mailto:` to `CONFIG.email`.

To wire up Formspree (or any JSON endpoint):

```js
formEndpoint: "https://formspree.io/f/XXXXXXX"
```

That's it — `main.js` will POST the JSON instead of opening the mail client.

## Design tokens

Change the accent, radii, shadows etc. at the top of `css/styles.css` under `:root`.

Currently:
- Accent: `#b08d57` (refined ocean/sand gold)
- Text: `#1d1d1f` · Muted: `#6e6e73`
- Backgrounds: white, `#f5f5f7`, black
- Font: system stack + Inter fallback (loaded from Google Fonts)

## Accessibility & SEO

- Semantic landmarks, alt text, keyboard focus states, `aria-pressed` on toggles.
- `prefers-reduced-motion` disables scroll reveals, parallax and smooth scroll.
- `<title>`, meta description, Open Graph tags and `<html lang="">` all update per language.
- `JSON-LD RealEstateAgent` schema in `<head>`.
- `hreflang` tags on each language (currently pointing to `./index.html` — update when you have per-locale URLs).

## TODO content markers

Search the codebase for `<!-- TODO: confirm -->` or `TODO: confirm` to find the handful of FAQ answers that are placeholders you'll want to replace with legally-vetted copy before launch.

## Browser support

Chromium, Firefox, Safari and Edge (recent versions). `backdrop-filter` falls back cleanly to a solid background in older browsers.
