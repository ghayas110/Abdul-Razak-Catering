/**
 * Shared read layer.
 *
 * Everything that is not catering-specific lives here: the trading identity
 * behind the website and the printed slip, and the period the dashboards open
 * on. The catering reads themselves are in `catering.ts`, which is the bulk of
 * this application's querying.
 */
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { query, queryOne } from './db';
import { BRAND_DEFAULTS, brandKey, normaliseBrand, type BrandInfo } from './brand-info';

/** Invalidated from the brand actions whenever Settings is saved. */
export const BRAND_TAG = 'brand';

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await queryOne<{ value: string }>(`SELECT value FROM settings WHERE \`key\` = ?`, [key]);
  return row?.value ?? fallback;
}

/**
 * The month a dashboard opens on: the current one.
 *
 * Kept as a function rather than inlined at every call site because the client
 * has asked before for the books to open on the previous month during the
 * first week, and that decision belongs in one place when it comes.
 */
export async function getDefaultPeriod(): Promise<{ year: number; month: number }> {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * The business profile, as saved in Settings, falling back to the defaults
 * baked into `brand-info.ts` for any field nobody has filled in yet.
 */
async function readBrand(): Promise<BrandInfo> {
  try {
    const rows = await query<{ key: string; value: string }>(
      `SELECT \`key\`, value FROM settings WHERE \`key\` LIKE 'brand.%'`,
    );
    const saved = new Map(rows.map((r) => [r.key, r.value]));
    const out = { ...BRAND_DEFAULTS };
    for (const field of Object.keys(BRAND_DEFAULTS) as (keyof BrandInfo)[]) {
      const v = saved.get(brandKey(field));
      if (v != null && v.trim() !== '') out[field] = v;
    }
    return normaliseBrand(out);
  } catch {
    // A missing settings table must never take the website down.
    return BRAND_DEFAULTS;
  }
}

/**
 * The trading identity, cached — because this is the single hottest read in
 * the app and it almost never changes.
 *
 * It is awaited by the ROOT LAYOUT, so before this every single request —
 * every page of the portal, every crawler hitting the public site, every
 * static-looking asset request that happened to route through a page — opened
 * a database connection and ran a query. The public landing page was worse
 * still: `generateMetadata` and the page body each called it again, so one
 * visit was three identical queries.
 *
 * Two layers, doing different jobs:
 *   `cache`           de-duplicates within ONE render pass, so layout +
 *                     metadata + page share a single call.
 *   `unstable_cache`  keeps the result between requests for an hour, so the
 *                     database is not touched at all on a normal page view.
 *
 * Saving Settings calls `revalidateTag(BRAND_TAG)`, so an edit still shows up
 * immediately rather than up to an hour later.
 */
const brandFromCache = unstable_cache(readBrand, ['brand'], { revalidate: 3600, tags: [BRAND_TAG] });

export const getBrand = cache((): Promise<BrandInfo> => brandFromCache());
