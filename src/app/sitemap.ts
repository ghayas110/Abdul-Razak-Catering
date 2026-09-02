import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/**
 * Served at /sitemap.xml.
 *
 * The one page a search engine should ever see. Everything else is either
 * behind a session (the staff portal, the print views) or has no standalone
 * value (the sign-in screen, the PWA offline fallback). Listing any of those
 * would invite crawls that end in redirects and waste crawl budget on a small
 * site.
 *
 * `robots.ts` blocks the same set, so the two files cannot drift into
 * disagreeing about what is public.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
