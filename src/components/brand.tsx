import { cn } from '@/lib/format';
import Image from 'next/image';
import logoMark from '../../public/logo-mark.png';
import logoLockup from '../../public/logo.png';

/**
 * Abdul Razzak Catering identity.
 *
 * The mark is the client's own ARC roundel: the monogram under a serving dome,
 * a gloved hand beneath it, inside a gold ring. It is the artwork the business
 * already trades under, so it is used as supplied rather than redrawn — the
 * sidebar, the printed slip and the PWA icons are all rasterised from that one
 * file (assets/arc-mark.png) by `scripts/gen-icons.mjs`.
 */

/**
 * The house monogram, in the sidebar and anywhere the lockup is too wide.
 *
 * This is the client's own artwork rather than drawn geometry, so it stays in
 * step with the printed slips and the app icon: all three come from the same
 * source file through `npm run icons`.
 *
 * The PNG is transparent, so it sits on light and dark surfaces alike. The
 * full lockup is `/logo.png`; this is the monogram alone.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src={logoMark}
      alt=""
      aria-hidden
      // No placeholder: it is a small transparent PNG, and asking for one
      // sends Next to the /_next/image endpoint that `unoptimized` disables.
      placeholder="empty"
      // The sidebar mark is on screen from the first paint on every signed-in
      // page, so it is not a lazy-load candidate.
      priority
      className={cn('h-9 w-9 object-contain', className)}
      draggable={false}
    />
  );
}

/**
 * The full lockup, centred. Used where the brand is the whole point of the
 * block: the top of a printed report, the customer-facing review page.
 *
 * Same artwork as the monogram and the app icon, so a customer sees one mark
 * everywhere. Transparent, so it sits on either theme.
 */
export function BrandLogo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const h = size === 'lg' ? 'h-28' : size === 'sm' ? 'h-14' : 'h-20';
  return (
    <Image
      src={logoLockup}
      alt="Abdul Razzak Catering"
      placeholder="empty"
      priority
      className={cn('mx-auto w-auto object-contain', h, className)}
      draggable={false}
    />
  );
}

/**
 * The mark with the house name beside it, on ONE line.
 *
 * There is deliberately no second line: the name is three words and is set as
 * three words everywhere it appears — sidebar, site header, footer, printed
 * letterhead. An earlier version split it into a wordmark plus a "Catering
 * Service" tagline underneath, which is exactly the look this replaced.
 */
export function BrandLockup({ compact, name, size = 'md' }: {
  compact?: boolean;
  name?: string;
  /**
   * `sm` in the sidebar, where the name shares its row with the notification
   * bell. At the full size the three words either wrap or run under the bell,
   * and the sidebar is widened to 288px to give even this size room to
   * breathe — measured, not guessed: 142px of text in 158px of space.
   */
  size?: 'sm' | 'md';
}) {
  // Written as a fallback rather than a default parameter so an explicit
  // `undefined` from a caller still lands on the house wordmark.
  const line = name ?? 'Abdul Razzak Catering';
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      {!compact && (
        <div className={cn(
          'font-display leading-tight text-gold-gradient whitespace-nowrap',
          size === 'sm' ? 'text-[14px]' : 'text-lg',
        )}>
          {line}
        </div>
      )}
    </div>
  );
}
