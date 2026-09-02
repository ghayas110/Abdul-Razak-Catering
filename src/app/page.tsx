import type { Metadata } from 'next';
import { getBrand } from '@/lib/data';
import { siteUrl } from '@/lib/site-url';
import { SiteNav } from '@/components/site/site-nav';
import { Hero } from '@/components/site/hero';
import { Occasions } from '@/components/site/occasions';
import { MenuPreview } from '@/components/site/menu-preview';
import { Enquire } from '@/components/site/enquire';
import { SiteFooter } from '@/components/site/site-footer';

/**
 * The public site.
 *
 * Four sections and nothing else: who this is and what they do, what they get
 * booked for, what they cook, and how to ask for a price. Each one is a
 * different shape on the page — a split hero, a bento, a banded three-column
 * menu, a split form — so scrolling never feels like the same block repeating.
 *
 * A Server Component that reads the trading identity from Settings and hands
 * it down. The four sections below are client leaves because each of them
 * animates; the composition itself renders on the server.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const description =
    `Wedding, mehndi, valima and corporate catering in ${brand.city || 'Karachi'}. `
    + 'Cooked fresh on the day and quoted in writing, per head.';
  return {
    metadataBase: new URL(siteUrl()),
    title: brand.siteName,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      title: brand.siteName,
      description,
      type: 'website',
      url: siteUrl(),
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: brand.name }],
    },
  };
}

export default async function HomePage() {
  const brand = await getBrand();

  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Occasions />
        <MenuPreview />
        <Enquire
          contact={{
            phone: brand.phone,
            phoneIntl: brand.phoneIntl,
            whatsapp: brand.whatsapp,
            whatsappDisplay: brand.whatsappDisplay,
            email: brand.email,
            address: brand.address,
          }}
        />
      </main>
      <SiteFooter brand={brand} />
    </>
  );
}
