/**
 * Squeezes the public site's photography, in place.
 *
 *   npm run photos
 *
 * The files in public/photos are served by the Node process on shared
 * hosting, so their weight is not just bandwidth — every megabyte is work the
 * app does instead of answering a real request. They arrived straight from a
 * stock library at full quality with camera metadata attached, which is far
 * more than the slots they are rendered into need.
 *
 * Each photo is:
 *   - capped at MAX_W wide (nothing on the site is displayed wider, even on a
 *     2x display),
 *   - re-encoded as progressive mozjpeg, so it paints top-down on a slow phone,
 *   - stripped of metadata,
 *   - written a second time as WebP, which the <Photo> component offers first
 *     and which is typically a third smaller again.
 *
 * Safe to run repeatedly: re-encoding an already-encoded file at the same
 * settings converges rather than degrading further, and it skips anything it
 * cannot make smaller.
 *
 * Run it after dropping in the client's own shoot.
 */
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'photos');

/** Widest the site ever renders one of these, times two for dense screens. */
const MAX_W = 1400;
const JPEG_Q = 72;
const WEBP_Q = 68;

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

async function main() {
  const files = (await readdir(DIR)).filter((f) => /\.jpe?g$/i.test(f));
  if (files.length === 0) {
    console.log('No JPEGs in public/photos — nothing to do.');
    return;
  }

  let before = 0;
  let after = 0;

  for (const file of files) {
    const path = join(DIR, file);
    const startSize = (await stat(path)).size;
    const meta = await sharp(path).metadata();

    const pipeline = () => {
      let p = sharp(path).rotate(); // honour EXIF orientation before stripping it
      if (meta.width > MAX_W) p = p.resize({ width: MAX_W, withoutEnlargement: true });
      return p;
    };

    const jpeg = await pipeline()
      .jpeg({ quality: JPEG_Q, progressive: true, mozjpeg: true })
      .toBuffer();

    const webpPath = join(DIR, `${basename(file, extname(file))}.webp`);
    const webp = await pipeline().webp({ quality: WEBP_Q }).toBuffer();
    await writeFile(webpPath, webp);

    // Only overwrite when the new encode is actually smaller, so re-running
    // this can never quietly make things worse.
    const keep = jpeg.length < startSize;
    if (keep) await writeFile(path, jpeg);

    before += startSize;
    after += (keep ? jpeg.length : startSize) + webp.length;

    console.log(
      `  ${file.padEnd(24)} ${meta.width}x${meta.height} ${kb(startSize)}`
      + ` → jpg ${kb(keep ? jpeg.length : startSize)}${keep ? '' : ' (kept original)'}`
      + ` + webp ${kb(webp.length)}`,
    );
  }

  console.log(
    `\n✓ ${files.length} photos: ${kb(before)} → ${kb(after)} for both formats`
    + ` (a browser downloads only one, so a visitor now pulls roughly ${kb(after / files.length / 2)} per image).`,
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
