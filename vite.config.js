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
// Filled brand glyphs (WhatsApp, Instagram): Simple Icons (https://simpleicons.org), CC0.
const glyphs = {
  instagram: 'M7.03.084c-1.277.06-2.149.264-2.91.563a5.9 5.9 0 0 0-2.124 1.388a5.9 5.9 0 0 0-1.38 2.127C.321 4.926.12 5.8.064 7.076s-.069 1.688-.063 4.947s.021 3.667.083 4.947c.061 1.277.264 2.149.563 2.911c.308.789.72 1.457 1.388 2.123a5.9 5.9 0 0 0 2.129 1.38c.763.295 1.636.496 2.913.552c1.278.056 1.689.069 4.947.063s3.668-.021 4.947-.082c1.28-.06 2.147-.265 2.91-.563a5.9 5.9 0 0 0 2.123-1.388a5.9 5.9 0 0 0 1.38-2.129c.295-.763.496-1.636.551-2.912c.056-1.28.07-1.69.063-4.948c-.006-3.258-.02-3.667-.081-4.947c-.06-1.28-.264-2.148-.564-2.911a5.9 5.9 0 0 0-1.387-2.123a5.9 5.9 0 0 0-2.128-1.38c-.764-.294-1.636-.496-2.914-.55C15.647.009 15.236-.006 11.977 0S8.31.021 7.03.084m.14 21.693c-1.17-.05-1.805-.245-2.228-.408a3.7 3.7 0 0 1-1.382-.895a3.7 3.7 0 0 1-.9-1.378c-.165-.423-.363-1.058-.417-2.228c-.06-1.264-.072-1.644-.08-4.848c-.006-3.204.006-3.583.061-4.848c.05-1.169.246-1.805.408-2.228c.216-.561.477-.96.895-1.382a3.7 3.7 0 0 1 1.379-.9c.423-.165 1.057-.361 2.227-.417c1.265-.06 1.644-.072 4.848-.08c3.203-.006 3.583.006 4.85.062c1.168.05 1.804.244 2.227.408c.56.216.96.475 1.382.895s.681.817.9 1.378c.165.422.362 1.056.417 2.227c.06 1.265.074 1.645.08 4.848c.005 3.203-.006 3.583-.061 4.848c-.051 1.17-.245 1.805-.408 2.23c-.216.56-.477.96-.896 1.38a3.7 3.7 0 0 1-1.378.9c-.422.165-1.058.362-2.226.418c-1.266.06-1.645.072-4.85.079s-3.582-.006-4.848-.06m9.783-16.192a1.44 1.44 0 1 0 1.437-1.442a1.44 1.44 0 0 0-1.437 1.442M5.839 12.012a6.161 6.161 0 1 0 12.323-.024a6.162 6.162 0 0 0-12.323.024M8 12.008A4 4 0 1 1 12.008 16A4 4 0 0 1 8 12.008',
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967c-.273-.099-.471-.148-.67.15c-.197.297-.767.966-.94 1.164c-.173.199-.347.223-.644.075c-.297-.15-1.255-.463-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.298-.347.446-.52s.198-.298.298-.497c.099-.198.05-.371-.025-.52s-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51a13 13 0 0 0-.57-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074s2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625c.712.227 1.36.195 1.871.118c.571-.085 1.758-.719 2.006-1.413s.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413',
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

const icon = (a) => glyphs[a.name]
  ? `<svg class="icon${a.class ? ` ${a.class}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${glyphs[a.name]}"/></svg>`
  : `<svg class="icon${a.class ? ` ${a.class}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${icons[a.name]}"/></svg>`;

// <x-btn href="#visit" variant="light" class="…" data-reveal>Book a class</x-btn>
// -> a pill whose label rolls on hover and whose arrow chip floods the pill.
// The rolling duplicate is aria-hidden, so the accessible name is the label once.
// `type="submit"` renders a <button>; `size="sm"` gives the compact nav version.
function button(s, label) {
  const a = attrs(s);
  const { variant = 'dark', size, class: extra, icon: chip = 'arrow', ...rest } = a;
  const tag = rest.type ? 'button' : 'a';
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, extra].filter(Boolean).join(' ');
  const passthrough = Object.entries(rest).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${v}"`)).join('');
  return `<${tag} class="${cls}"${passthrough} data-magnetic>` +
    `<span class="btn__label"><span class="btn__roll"><span>${label}</span><span aria-hidden="true">${label}</span></span></span>` +
    `<span class="btn__chip${chip !== 'arrow' ? ' btn__chip--still' : ''}" aria-hidden="true">${icon({ name: chip })}</span>` +
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
