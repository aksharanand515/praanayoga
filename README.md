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

## Structure

- `index.html` — all content and SEO (meta, Open Graph, JSON-LD). `<x-pic>` and
  `<x-icon>` are build-time shorthands expanded by `vite.config.js` into static
  `<picture>` / inline SVG markup.
- `src/styles.css` — design tokens and layout in a Kerala palette: kasavu ivory
  and zari gold, teak night, the studio's laterite red, mural green. Gold
  `.kasavu` bands mark section edges; section numbers are Malayalam numerals.
- `src/hero-gl.js` — the hero scene in raw WebGL (one full-screen triangle, one
  fragment shader, ~5 KB): a nilavilakku flame is lit, its light reveals the
  framed photograph, photographs breathe on a 4 s in / 6 s out pranayama rhythm
  and pass into one another through an ember-edged dissolve. Pauses offscreen
  and on hidden tabs, survives context loss, and has a Pause control.
- `src/main.js` — motion: GSAP + ScrollTrigger, Lenis smooth scroll, the lamp
  intro, the frame opening to full bleed with the story sliding over it, the
  Malayalam mantra band, the horizontal workshops track, the philosophy
  sequence, nav theming, mobile menu and the booking letter (composes an email).

Accessibility: everything is readable with JavaScript off, and without WebGL the
framed poster image stands in. `prefers-reduced-motion` skips the lamp intro,
smooth scrolling and all scroll-driven animation. Split headings keep an
unsplit copy for screen readers.

## Content sources

- Services, timings, teacher bio, motto: praanayoga.com.
- Retreat details and 2027 dates: samyaretreats.com (Nithin's retreat programme). Check dates each season.
- Address, rating (5.0 from 84 reviews) and review excerpts: the studio's public
  Tripadvisor listing, as of September 2026. Update the count as it grows.

## Media provenance

- Studio photographs: Praana Yoga Studio's own images, as published on praanayoga.com.
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
