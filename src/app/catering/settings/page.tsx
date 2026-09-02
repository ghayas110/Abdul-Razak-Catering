import { requirePermission } from '@/lib/session';
import { getCateringProfile } from '@/lib/catering';
import { getBrand } from '@/lib/data';
import { BrandProfileCard } from '@/components/brand-profile-card';
import { SettingsClient } from './settings-client';

export const metadata = { title: 'Settings — Catering' };
export const dynamic = 'force-dynamic';

/**
 * Two profiles, and they are genuinely different things.
 *
 * The BUSINESS profile is the public identity: the name Google shows, the
 * number the website's call button dials, the social handles in the footer.
 * The QUOTATION profile is what prints on the letterhead of a slip, which the
 * client has always wanted to word differently from the website.
 *
 * Both start empty on a fresh install. This screen is the first stop.
 */
export default async function CateringSettingsPage() {
  await requirePermission('catering.manage');
  const [profile, brand] = await Promise.all([getCateringProfile(), getBrand()]);
  return (
    <div className="space-y-8">
      <SettingsClient profile={profile} />
      <BrandProfileCard brand={brand} />
    </div>
  );
}
