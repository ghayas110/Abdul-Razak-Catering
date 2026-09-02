import { requirePermission } from '@/lib/session';
import { AppShell } from '@/components/app-shell';
import { CATERING_NAV } from '@/lib/nav';
import { getCateringProfile } from '@/lib/catering';

/**
 * The staff portal.
 *
 * Gated on `catering.view`, the one permission every role in this business
 * holds. Anyone signed in without it is bounced by `requirePermission` rather
 * than shown an empty shell.
 */
export default async function CateringLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission('catering.view');
  const profile = await getCateringProfile();

  // The sidebar wears the trading name from Settings, not a hardcoded one.
  const [first, ...rest] = profile.name.split(' ');
  return (
    <AppShell
      user={user}
      nav={CATERING_NAV}
      homeHref="/catering"
      brandName={first || 'Catering'}
      brandSub={(rest.join(' ') || 'Catering').toUpperCase()}
    >
      {children}
    </AppShell>
  );
}
