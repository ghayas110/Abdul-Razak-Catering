/**
 * Builds every logo and icon the app serves from ONE source file:
 * assets/arc-mark.png — the client's own ARC roundel.
 *
 *   logo-mark.png    the mark, transparent, for the sidebar and the slip
 *   logo.png         the lockup: mark + wordmark, for wide placements
 *   mail-logo.png    the same lockup, named for the mail templates
 *   icons/*          the launcher/favicon set, on the app's own dark ground
 *
 * The mark is a single roundel that reads at every size, so unlike the drawn
 * mark it replaced there is no separate small-size glyph — the same artwork is
 * rasterised down, with a tighter inset where every pixel counts.
 *
 *   npm run icons
 */
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The icon set is written to a VERSIONED folder, and the version is owned by
 * src/lib/icons.ts so the app and this script can never disagree about where
 * the icons are. Read with a regex rather than an import because this is a
 * plain .mjs script and that is a TypeScript module.
 *
 * See the comment in that file for why the version is in the path and not a
 * ?v= query string — the short version is that iPhones ignore the query.
 */
const ICON_VERSION = (
  await readFile(join(ROOT, 'src', 'lib', 'icons.ts'), 'utf8')
).match(/ICON_VERSION\s*=\s*'([^']+)'/)?.[1];
if (!ICON_VERSION) throw new Error('Could not read ICON_VERSION from src/lib/icons.ts');
const ICONS = join(ROOT, 'public', 'icons', ICON_VERSION);
const SRC = join(ROOT, 'assets', 'arc-mark.png');

const BG = '#0B0B0D'; // --bg, so an icon matches the app's first paint
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** The mark alone, square, transparent, at the given box size. */
async function render(size) {
  return sharp(SRC)
    .resize(size, size, { fit: 'contain', background: TRANSPARENT })
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
  const art = await render(box);
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toBuffer();
}

/**
 * The wide lockup: the mark on the left, the house name set beside it on ONE
 * line. The name is three words and stays three words — there is no tagline
 * under it, on paper or on screen.
 *
 * The wordmark is drawn as SVG text rather than composed from a font file, so
 * the rasteriser needs no webfont. The stack ends in `serif`, which every
 * machine that can run this build has. The canvas is deliberately oversized
 * and then trimmed, so the text can be any width without being measured here.
 */
async function lockup() {
  const markPx = 220;
  const mark = (await readFile(SRC)).toString('base64');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="300" viewBox="0 0 1800 300">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A6841C"/>
      <stop offset="0.42" stop-color="#F0D67B"/>
      <stop offset="1" stop-color="#C9A227"/>
    </linearGradient>
  </defs>
  <image x="20" y="${(300 - markPx) / 2}" width="${markPx}" height="${markPx}"
    href="data:image/png;base64,${mark}"/>
  <text x="${20 + markPx + 34}" y="182" font-family="Playfair Display, Georgia, Times New Roman, serif"
    font-size="84" letter-spacing="2" fill="url(#gold)">ABDUL RAZZAK CATERING</text>
</svg>`;

  return sharp(Buffer.from(svg), { density: 288 })
    .png()
    .trim({ background: TRANSPARENT, threshold: 0 })
    .resize({ width: 1000 })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(ICONS, { recursive: true });

  await writeFile(join(ROOT, 'public', 'logo-mark.png'), await render(512));
  console.log('  ✓ logo-mark.png');

  const wide = await lockup();
  await writeFile(join(ROOT, 'public', 'logo.png'), wide);
  await writeFile(join(ROOT, 'public', 'mail-logo.png'), wide);
  console.log('  ✓ logo.png, mail-logo.png');

  const targets = [
    // Tight inset at small sizes: every pixel of padding is a pixel the mark
    // does not get.
    ['favicon-16.png', 16, 0.02],
    ['favicon-32.png', 32, 0.02],
    ['icon-96.png', 96, 0.05],
    ['icon-128.png', 128, 0.05],
    ['icon-192.png', 192, 0.05],
    ['icon-256.png', 256, 0.05],
    ['icon-384.png', 384, 0.05],
    ['icon-512.png', 512, 0.05],
    // Apple never masks, but it does round the corners itself.
    ['apple-touch-icon.png', 180, 0.08],
    // Maskable: the launcher may crop to a circle, so stay inside the safe zone.
    ['icon-maskable-192.png', 192, 0.20],
    ['icon-maskable-512.png', 512, 0.20],
  ];

  for (const [name, size, inset] of targets) {
    await writeFile(join(ICONS, name), await icon(size, inset));
    console.log(`  ✓ icons/${ICON_VERSION}/${name}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
