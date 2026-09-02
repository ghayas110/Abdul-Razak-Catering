/**
 * Builds every logo and icon the app serves from TWO source files:
 * assets/mark-full.svg and assets/mark-glyph.svg.
 *
 * Vector in, raster out. The previous house did this by keying a JPEG's
 * brightness into alpha, because its artwork only existed as a photograph of a
 * printed lockup. This mark is drawn, so there is nothing to key: every size
 * is rendered from the geometry at its own resolution and stays crisp.
 *
 *   logo-mark.png    the full mark, transparent, for the sidebar and the slip
 *   logo.png         the full lockup with the wordmark, for wide placements
 *   mail-logo.png    the same lockup, named for the mail templates
 *   icons/*          the launcher/favicon set, on the app's own dark ground
 *
 * Below 64px the FULL mark is replaced by the glyph. The octagon ring is a
 * hairline and the steam is filigree: at 32px both average out to a dark
 * smudge, while the dome silhouette still reads.
 *
 *   npm run icons
 */
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = join(ROOT, 'public', 'icons');

const BG = '#0B0B0D'; // --bg, so an icon matches the app's first paint

/** Below this size the ring and the steam stop reading — use the glyph. */
const TIGHT_BELOW = 64;

/** Render an SVG file to a PNG buffer at the given box size. */
async function render(file, size) {
  const svg = await readFile(join(ROOT, 'assets', file));
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * One icon: the mark on the brand's dark ground.
 *
 * `inset` is the share of the canvas left as breathing room. Maskable icons
 * need a wide one because Android crops to whatever shape the launcher wants,
 * and anything outside the middle 80% can be cut off.
 */
async function icon(size, inset) {
  const box = Math.max(1, Math.round(size * (1 - inset * 2)));
  const art = await render(size < TIGHT_BELOW ? 'mark-glyph.svg' : 'mark-full.svg', box);
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toBuffer();
}

/**
 * The wide lockup: the mark on the left, the house name set beside it.
 *
 * The mark itself is not redrawn here. Its body is lifted out of
 * mark-full.svg at build time, so the lockup and the icons can never drift
 * apart after someone nudges a curve in the source file.
 *
 * The wordmark is drawn as SVG text rather than composed from a font file, so
 * the rasteriser needs no webfont. The stack ends in `serif`, which every
 * machine that can run this build has.
 */
async function lockup() {
  const src = await readFile(join(ROOT, 'assets', 'mark-full.svg'), 'utf8');
  // Everything between </defs> and </svg> is the mark's geometry. The gradient
  // it references is redeclared below under the same id.
  const body = src.slice(src.indexOf('</defs>') + 7, src.lastIndexOf('</svg>'));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 260" width="1000" height="260">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A6841C"/>
      <stop offset="0.42" stop-color="#F0D67B"/>
      <stop offset="1" stop-color="#C9A227"/>
    </linearGradient>
  </defs>
  <g transform="translate(8 8) scale(0.476)">${body}</g>
  <text x="278" y="128" font-family="Playfair Display, Georgia, Times New Roman, serif"
    font-size="84" letter-spacing="1.5" fill="url(#gold)">ABDUL RAZAK</text>
  <text x="281" y="182" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="32" letter-spacing="12.2" fill="#C9C4B6">CATERING SERVICE</text>
</svg>`;
}

async function main() {
  await mkdir(ICONS, { recursive: true });

  const mark = await render('mark-full.svg', 512);
  await writeFile(join(ROOT, 'public', 'logo-mark.png'), mark);
  console.log('  ✓ logo-mark.png');

  const wide = await sharp(Buffer.from(await lockup()), { density: 288 })
    .resize({ width: 1000 }).png().toBuffer();
  await writeFile(join(ROOT, 'public', 'logo.png'), wide);
  await writeFile(join(ROOT, 'public', 'mail-logo.png'), wide);
  console.log('  ✓ logo.png, mail-logo.png');

  const targets = [
    // Tight inset at small sizes: every pixel of padding is a pixel the mark
    // does not get.
    ['favicon-16.png', 16, 0.02],
    ['favicon-32.png', 32, 0.02],
    ['icon-96.png', 96, 0.07],
    ['icon-128.png', 128, 0.07],
    ['icon-192.png', 192, 0.07],
    ['icon-256.png', 256, 0.07],
    ['icon-384.png', 384, 0.07],
    ['icon-512.png', 512, 0.07],
    // Apple never masks, but it does round the corners itself.
    ['apple-touch-icon.png', 180, 0.10],
    // Maskable: the launcher may crop to a circle, so stay inside the safe zone.
    ['icon-maskable-192.png', 192, 0.20],
    ['icon-maskable-512.png', 512, 0.20],
  ];

  for (const [name, size, inset] of targets) {
    await writeFile(join(ICONS, name), await icon(size, inset));
    console.log(`  ✓ icons/${name}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
