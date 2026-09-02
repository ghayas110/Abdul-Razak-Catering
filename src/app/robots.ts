import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/**
 * Served at /robots.txt.
 *
 * Disallow is not a security control: every private path here is already
 * behind a session check, and this file is publicly readable. It is a crawl
 * instruction, which is why the list names directories rather than spelling
 * out anything sensitive.
 *
 * The printable slips matter most: a quotation URL is guessable by number, and
 * although every one of them is behind a session check, there is no reason for
 * a crawler to be walking that range at all.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/catering/',  // the staff portal
          '/print/',     // printable quotations, invoices and reports
          '/api/',       // endpoints
          '/login',      // no standalone value, and it redirects when signed in
          '/offline',    // PWA fallback shell
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
