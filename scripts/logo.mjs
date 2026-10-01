// Turns the studio's logo (on a flat cream background) into transparent brand
// assets: a full-colour version for light grounds, a light version for photos
// and dark grounds, and the favicons. Run: npm run logo
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets/originals/logo.webp');
const OUT = path.join(root, 'public/brand');
await mkdir(OUT, { recursive: true });

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// Background colour: the average of the four corners.
const at = (x, y) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
const corners = [at(4, 4), at(W - 5, 4), at(4, H - 5), at(W - 5, H - 5)];
const bg = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / 4);

const IVORY = [252, 250, 245];
const colour = Buffer.alloc(W * H * 4);
const light = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const d = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
  // Soft key: anti-aliased edges keep partial alpha.
  const a = Math.min(1, Math.max(0, (d - 14) / 52));
  // Un-mix the cream from edge pixels so no pale fringe remains on dark grounds.
  const un = (c, k) => (a > 0 ? Math.min(255, Math.max(0, Math.round((c - bg[k] * (1 - a)) / a))) : 0);
  const rr = un(r, 0), gg = un(g, 1), bb = un(b, 2);
  colour.set([rr, gg, bb, Math.round(a * 255)], i * 4);
  // Light version: terracotta accents stay, everything else becomes ivory.
  const warm = rr - gg > 38 && rr > 150;
  light.set(warm ? [rr, gg, bb, Math.round(a * 255)] : [...IVORY, Math.round(a * 255)], i * 4);
}

const raw = { raw: { width: W, height: H, channels: 4 } };
// Trim to the artwork, keep it square, then export at display sizes.
const trimmed = async (buf) => sharp(buf, raw).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
for (const [name, buf] of [['logo-colour', colour], ['logo-light', light]]) {
  const t = await trimmed(buf);
  const side = Math.max(t.info.width, t.info.height);
  const square = await sharp(t.data).extend({
    top: Math.floor((side - t.info.height) / 2), bottom: Math.ceil((side - t.info.height) / 2),
    left: Math.floor((side - t.info.width) / 2), right: Math.ceil((side - t.info.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png().toBuffer();
  for (const size of [160, 320, 560]) {
    await sharp(square).resize(size, size).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT, `${name}-${size}.webp`));
    await sharp(square).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, `${name}-${size}.png`));
  }
  console.log(name, `trimmed ${t.info.width}x${t.info.height}`);
}

// Favicons: the meditating figure alone, on warm ivory.
// Crop around the figure, then cover the two corners where the arc lettering intrudes.
const corner = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: '#F7F2E8' } }).png().toBuffer();
const figure = await sharp(SRC).extract({ left: 375, top: 315, width: 505, height: 590 })
  .composite([
    { input: await corner(150, 80), left: 0, top: 0 },
    { input: await corner(150, 80), left: 355, top: 0 },
  ]).toBuffer();
const mark = async (size, pad) => sharp({ create: { width: size, height: size, channels: 4, background: '#F5F0E7' } })
  .composite([{ input: await sharp(figure).resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: '#F7F2E8' }).toBuffer(), gravity: 'center' }])
  .png().toBuffer();
await writeFile(path.join(root, 'public/apple-touch-icon.png'), await mark(180, 14));
await writeFile(path.join(root, 'public/favicon-192.png'), await mark(192, 14));
// ICO with embedded PNGs (16, 32, 48)
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => mark(s, Math.max(1, Math.round(s * 0.06)))));
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dirs = sizes.map((s, i) => {
  const d = Buffer.alloc(16);
  d.writeUInt8(s, 0); d.writeUInt8(s, 1); d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
  d.writeUInt32LE(pngs[i].length, 8); d.writeUInt32LE(offset, 12); offset += pngs[i].length;
  return d;
});
await writeFile(path.join(root, 'public/favicon.ico'), Buffer.concat([head, ...dirs, ...pngs]));
console.log('favicons done');
