import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Expands two authoring shorthands in index.html at build (and dev) time, so the
// shipped page is plain, static, crawlable markup:
//   <x-pic name="savasana" alt="…" sizes="…" class="…" eager></x-pic>  -> <picture> (AVIF + WebP)
//   <x-icon name="arrow"></x-icon>                                      -> inline Solar icon SVG
const manifest = () => JSON.parse(readFileSync(new URL('./public/img/manifest.json', import.meta.url)));

// Solar icon set via Iconify (https://icon-sets.iconify.design/solar/), CC BY 4.0, 480 Design.
const icons = {
  arrow: 'M4 12H20M14 18L20 12L14 6',
  'arrow-up-right': 'M6 18L18 6M18 15V6H9',
};

const attrs = (s) => Object.fromEntries([...s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map((m) => [m[1], m[2] ?? true]));

function picture(a) {
  const m = manifest()[a.name];
  if (!m) throw new Error(`Unknown image: ${a.name}`);
  const set = (ext) => m.widths.map((w) => `/img/${a.name}-${w}.${ext} ${Math.min(w, m.width)}w`).join(', ');
  const fallback = `/img/${a.name}-${m.widths[Math.min(1, m.widths.length - 1)]}.webp`;
  const sizes = a.sizes || '100vw';
  const loading = a.eager ? 'eager' : 'lazy';
  const priority = a.eager ? ' fetchpriority="high"' : '';
  return `<picture${a.class ? ` class="${a.class}"` : ''}>` +
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="${fallback}" alt="${a.alt ?? ''}" width="${m.width}" height="${m.height}" loading="${loading}" decoding="async"${priority}${a.style ? ` style="${a.style}"` : ''}>` +
    `</picture>`;
}

const icon = (a) =>
  `<svg class="icon${a.class ? ` ${a.class}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${icons[a.name]}"/></svg>`;

// <x-btn href="#visit" variant="light" class="…" data-reveal>Book a class</x-btn>
// -> a pill whose label rolls on hover and whose arrow chip floods the pill.
// The rolling duplicate is aria-hidden, so the accessible name is the label once.
// `type="submit"` renders a <button>; `size="sm"` gives the compact nav version.
function button(s, label) {
  const a = attrs(s);
  const { variant = 'dark', size, class: extra, ...rest } = a;
  const tag = rest.type ? 'button' : 'a';
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, extra].filter(Boolean).join(' ');
  const passthrough = Object.entries(rest).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${v}"`)).join('');
  return `<${tag} class="${cls}"${passthrough} data-magnetic>` +
    `<span class="btn__label"><span class="btn__roll"><span>${label}</span><span aria-hidden="true">${label}</span></span></span>` +
    `<span class="btn__chip" aria-hidden="true">${icon({ name: 'arrow' })}</span>` +
    `</${tag}>`;
}

export default defineConfig({
  plugins: [
    {
      name: 'praana-html',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          html
            .replace(/<x-pic\s([^>]*)><\/x-pic>/g, (_, s) => picture(attrs(s)))
            .replace(/<x-icon\s([^>]*)><\/x-icon>/g, (_, s) => icon(attrs(s)))
            .replace(/<x-btn\s([^>]*)>([\s\S]*?)<\/x-btn>/g, (_, s, label) => button(s, label.trim())),
      },
    },
  ],
  build: { target: 'es2020', cssMinify: true, assetsInlineLimit: 0 },
});
