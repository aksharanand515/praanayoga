// Subsets the self-hosted fonts to the characters the page actually uses
// (plus full Basic Latin + Latin-1 so visitors' names still render in the
// booking form). Keeps variable axes and OpenType layout. Run: npm run fonts
import subsetFont from 'subset-font';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => path.join(root, 'node_modules', p);
const OUT = path.join(root, 'src/fonts');

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const js = await readFile(path.join(root, 'src/main.js'), 'utf8');
const text = (html + js)
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&thinsp;/g, ' ').replace(/&ensp;/g, ' ').replace(/&amp;/g, '&');

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join('');
const base = range(0x20, 0x7e) + range(0xa0, 0xff) + '‘’“”–—…·•→←↑↓°×−';
const used = [...new Set(text)].join('');
const latinSet = [...new Set(base + used)].filter((c) => c.codePointAt(0) < 0x100 || '‘’“”–—…·•→←↑↓°×−  '.includes(c)).join('');
const extSet = [...new Set(used)].filter((c) => { const n = c.codePointAt(0); return n >= 0x100 && n <= 0x24f || n >= 0x1e00 && n <= 0x1eff; }).join('');
const mlSet = [...new Set(used)].filter((c) => { const n = c.codePointAt(0); return n >= 0xd00 && n <= 0xd7f; }).join('') + '‌‍◌';

const jobs = [
  ['newsreader-latin-normal', '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2', latinSet],
  ['newsreader-latin-italic', '@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2', latinSet],
  ['newsreader-ext-normal', '@fontsource-variable/newsreader/files/newsreader-latin-ext-opsz-normal.woff2', extSet],
  ['newsreader-ext-italic', '@fontsource-variable/newsreader/files/newsreader-latin-ext-opsz-italic.woff2', extSet],
  ['instrument-sans-latin', '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2', latinSet],
  ['noto-serif-malayalam', '@fontsource-variable/noto-serif-malayalam/files/noto-serif-malayalam-malayalam-wght-normal.woff2', mlSet],
];

await mkdir(OUT, { recursive: true });
for (const [name, src, chars] of jobs) {
  const input = await readFile(nm(src));
  const out = await subsetFont(input, chars, { targetFormat: 'woff2' });
  await writeFile(path.join(OUT, `${name}.woff2`), out);
  console.log(`${name}: ${(input.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB (${[...chars].length} chars)`);
}
console.log('latin-ext chars:', extSet, ' malayalam:', mlSet);
