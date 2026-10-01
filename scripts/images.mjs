// Build-time image pipeline: crops each original photograph and writes
// responsive AVIF + WebP renditions to public/img. Run with `npm run images`.
//
// Provenance
//   Praana Yoga Studio's own photographs, as published on praanayoga.com.
//   samya-* images: Samya Retreats' own library (samyaretreats.com), the retreat
//   programme co-founded by Praana's lead teacher, Nithin Xavier.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets/originals');
const OUT = path.join(root, 'public/img');

// extract: { left, top, width, height } in source pixels
const images = [
  { name: 'hall', file: 'hall-teaching.jpg', widths: [800, 1280] },
  { name: 'gallery-shala', file: 'samya-yoga-shala.webp', extract: { left: 0, top: 450, width: 768, height: 768 }, widths: [480, 768] },
  { name: 'gallery-tea', file: 'samya-munnar-tea-estate.webp', extract: { left: 0, top: 298, width: 768, height: 768 }, widths: [480, 768] },
  { name: 'gallery-sea', file: 'samya-sea-sunset.webp', extract: { left: 0, top: 248, width: 640, height: 640 }, widths: [480, 640] },
  { name: 'gallery-lake', file: 'samya-mirror-water-kayak.webp', extract: { left: 0, top: 249, width: 640, height: 640 }, widths: [480, 640] },
  { name: 'japan-class', file: 'japan-class.jpg', extract: { left: 880, top: 0, width: 900, height: 1125 }, widths: [600, 900] },
  { name: 'nithin-studio', file: 'nithin-studio-portrait.jpg', extract: { left: 0, top: 0, width: 960, height: 1200 }, widths: [640, 960] },
  { name: 'one-arm-handstand', file: 'one-arm-handstand.jpg', extract: { left: 0, top: 230, width: 680, height: 850 }, widths: [560, 680], grade: 'warm' },
  { name: 'standing-splits', file: 'standing-splits.jpg', extract: { left: 0, top: 50, width: 843, height: 1054 }, widths: [640, 843] },
  { name: 'pranayama-grass', file: 'pranayama-grass.jpg', extract: { left: 0, top: 300, width: 731, height: 914 }, widths: [560, 731] },
  { name: 'garden-group', file: 'garden-group.jpg', extract: { left: 0, top: 0, width: 977, height: 1170 }, widths: [640, 977] },
  { name: 'private-adjustment', file: 'private-adjustment.webp', extract: { left: 0, top: 470, width: 936, height: 1170 }, widths: [640, 936] },
  { name: 'savasana', file: 'IMG_20240216_105354_539-1.jpg', widths: [800, 1200, 1600] },
  { name: 'prasarita', file: 'IMG_20240209_101652_959-1.jpg', widths: [640, 1000, 1400] },
  { name: 'nithin-portrait', file: '5dd0f486-1037-45ac-9184-0836d25447b4.jpg', widths: [560, 900, 1113] },
  { name: 'nithin-pose', file: 'Screenshot_20240614-191128__01.jpg', extract: { left: 0, top: 0, width: 1080, height: 1350 }, widths: [560, 860, 1080] },
  { name: 'group-sun', file: 'IMG_20240127_202327_393.jpeg', widths: [560, 1050] },
  { name: 'group-japan', file: 'IMG_20240215_144904_757.webp', extract: { left: 0, top: 360, width: 925, height: 840 }, widths: [560, 925] },
  { name: 'group-four', file: 'IMG_20240402_195014_891.jpg', widths: [560, 879] },
  { name: 'handstand', file: 'Screenshot_20240106-145845-1.jpg', extract: { left: 0, top: 300, width: 756, height: 660 }, widths: [560, 756] },
  { name: 'group-five', file: 'Screenshot_20240121-201954-1.jpg', extract: { left: 0, top: 450, width: 756, height: 740 }, widths: [560, 756] },
  { name: 'retreat-ridge', file: 'samya-hero-sunrise-2048.webp', widths: [800, 1400, 2048] },
  { name: 'retreat-sunrise', file: 'samya-sunrise-meditation.webp', widths: [640, 1200] },
  { name: 'retreat-guidance', file: 'samya-headstand-guidance.webp', widths: [560, 768] },
  { name: 'kathakali', file: 'samya-kathakali.webp', extract: { left: 0, top: 120, width: 510, height: 760 }, widths: [510] },
  { name: 'sea-sunset', file: 'samya-sea-sunset.webp', widths: [640] },
  { name: 'kochi-golden', file: 'samya-kochi-golden-hour.webp', widths: [640] },
  { name: 'retreat-founders', file: 'samya-achu-and-nithin-1804.webp', extract: { left: 0, top: 700, width: 1804, height: 1704 }, widths: [640, 1100] },
];

await mkdir(OUT, { recursive: true });
const only = process.argv.slice(2);
const manifestPath = path.join(OUT, 'manifest.json');
const manifest = only.length ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};

for (const img of images.filter((i) => !only.length || only.some((o) => i.name.startsWith(o)))) {
  const base = () => {
    let p = sharp(path.join(SRC, img.file)).rotate();
    if (img.extract) p = p.extract(img.extract);
    if (img.grade === 'warm') {
      p = p.modulate({ saturation: 0.72, brightness: 1.04 })
        .recomb([[1.06, 0.04, 0], [0.02, 1.0, 0], [0, 0.02, 0.88]])
        .linear(0.94, 10);
    }
    return p;
  };
  const meta = await base().toBuffer({ resolveWithObject: true });
  const { width, height } = meta.info;
  for (const w of img.widths) {
    const resized = () => base().resize({ width: Math.min(w, width), withoutEnlargement: true });
    await resized().avif({ quality: 52, effort: 6 }).toFile(path.join(OUT, `${img.name}-${w}.avif`));
    await resized().webp({ quality: 74, effort: 6 }).toFile(path.join(OUT, `${img.name}-${w}.webp`));
  }
  manifest[img.name] = { width, height, widths: img.widths };
  console.log(`${img.name}: ${width}x${height} -> ${img.widths.join(', ')}`);
}

// Open Graph card (1200x630, JPEG for maximum compatibility)
await sharp(path.join(SRC, 'hall-teaching.jpg'))
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(root, 'public/og-image.jpg'));

await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log('done');
