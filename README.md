# Praana Yoga Studio — praanayoga.com

Single-page site for Praana Yoga Studio, Mackenzie Lane, Pattalam, Fort Kochi.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static output in dist/ — deploy to any static host
npm run preview   # serve the production build
```

`npm run images` regenerates `public/img/` (AVIF + WebP, responsive widths) from
`assets/originals/`. `npm run fonts` re-subsets the fonts in `src/fonts/` to the
characters used on the page — run it after changing copy that adds new
characters (e.g. new Sanskrit words).

`npm run logo` rebuilds the brand assets in `public/brand/` (transparent full-colour
and light versions of the logo) and the favicons from `assets/originals/logo.webp`.

Enquiries go to WhatsApp (+91 80899 48747): the booking form, the private-session
button, the floating chat button and the footer all open `wa.me/918089948747`,
the form with the message pre-written. The number lives in `WHATSAPP` in
`src/main.js` and in the links in `index.html`.

## Structure

- `index.html` — all content and SEO (meta, Open Graph, JSON-LD). `<x-pic>` and
  `<x-icon>` are build-time shorthands expanded by `vite.config.js` into static
  `<picture>` / inline SVG markup.
- `src/styles.css` — design tokens and layout. Palette: Warm Ivory #F5F0E7,
  Warm White #FCFAF5, Soft Sand #E6DDCE, Muted Sage #8C9680, Deep Olive #4B5540,
  Terracotta #B8755A (accents; #8E5139 for small text, for contrast) and
  Charcoal Brown #292824. Serif headings (Newsreader), sans body (Instrument
  Sans), outline pill buttons.
- `src/main.js` — motion: GSAP + ScrollTrigger and Lenis smooth scroll. Hero
  intro and scroll parallax, word-by-word heading reveals, image reveals,
  staggered cards, nav states (transparent over the hero, olive over olive
  sections), mobile menu and the WhatsApp enquiry (class and day choices, live preview).

Accessibility: everything is readable with JavaScript off, and
`prefers-reduced-motion` turns off smooth scrolling and all animation. Split
headings keep an unsplit copy for screen readers.

## Content sources

- Services, timings, teacher bio, motto: praanayoga.com.
- Retreat details and 2027 dates: samyaretreats.com (Nithin's retreat programme). Check dates each season.
- Address, rating (5.0 from 84 reviews) and review excerpts: the studio's public
  Tripadvisor listing, as of September 2026. Update the count as it grows.

## Media provenance

- Studio photographs: Praana Yoga Studio's own images (hero: the hall, supplied
  by the studio; others as published on praanayoga.com).
- `retreat-*`, `kathakali`, `sea-sunset`, `kochi-golden` photographs: Samya
  Retreats' own library (samyaretreats.com), Nithin's retreat programme.
- Fonts (SIL OFL 1.1): Newsreader, Instrument Sans, Noto Serif Malayalam.
- Icons: Solar icon set via Iconify, CC BY 4.0, 480 Design.

## Deploying to praanayoga.com (Hostinger)

`main` holds the source. `npm run deploy` builds the site and commits the output
to the `deploy` branch; Hostinger's Git integration pulls that branch into
`public_html`. `public/.htaccess` ships with the build (HTTPS + bare-domain
redirect, compression, long-lived caching for hashed assets).

```bash
git add -A && git commit -m "Describe the change"
git push
npm run deploy
```

If auto-deployment is switched on in hPanel (with its webhook added to the
GitHub repo), the live site updates a few seconds after `npm run deploy`.
Otherwise press **Deploy** in hPanel → Advanced → Git.
