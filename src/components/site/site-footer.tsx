import Link from 'next/link';
import { BrandLockup } from '@/components/brand';
import { facebookUrl, instagramUrl, type BrandInfo } from '@/lib/brand-info';

/**
 * The footer.
 *
 * Contact details and the staff door, nothing else. Social links appear only
 * for handles that have actually been filled in under Settings, so the row
 * never renders as a set of icons pointing at nothing.
 */
export function SiteFooter({ brand }: { brand: BrandInfo }) {
  const year = new Date().getFullYear();

  return (
    <footer className="no-print border-t border-[rgb(var(--border)/0.5)] bg-[rgb(var(--surface)/0.5)]">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <BrandLockup name="Abdul Razak" sub="Catering Service" />
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-[rgb(var(--text-dim))]">
              Wedding and event catering in {brand.city || 'Karachi'}.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 text-sm sm:items-end">
            {brand.phoneIntl && (
              <a href={`tel:+${brand.phoneIntl}`} className="text-[rgb(var(--text-muted))] hover:text-gold">
                {brand.phone}
              </a>
            )}
            {brand.email && (
              <a href={`mailto:${brand.email}`} className="text-[rgb(var(--text-muted))] hover:text-gold">
                {brand.email}
              </a>
            )}
            {brand.address && (
              <span className="max-w-[40ch] text-[rgb(var(--text-dim))] sm:text-right">{brand.address}</span>
            )}
            <div className="mt-1 flex gap-4 sm:justify-end">
              {brand.facebook && (
                <a href={facebookUrl(brand)} target="_blank" rel="noreferrer noopener" className="text-[rgb(var(--text-muted))] hover:text-gold">
                  Facebook
                </a>
              )}
              {brand.instagram && (
                <a href={instagramUrl(brand)} target="_blank" rel="noreferrer noopener" className="text-[rgb(var(--text-muted))] hover:text-gold">
                  Instagram
                </a>
              )}
              <Link href="/login" className="text-[rgb(var(--text-muted))] hover:text-gold">
                Staff login
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[rgb(var(--border)/0.4)] pt-6 text-xs text-[rgb(var(--text-dim))]">
          © {year} {brand.name}
        </div>
      </div>
    </footer>
  );
}
