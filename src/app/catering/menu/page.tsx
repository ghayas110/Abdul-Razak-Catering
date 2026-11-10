import { requirePermission } from '@/lib/session';
import { getCateringMenu } from '@/lib/catering';
import { MenuClient } from './menu-client';

export const metadata = { title: 'Menu & Rates — Catering' };
export const dynamic = 'force-dynamic';

export default async function CateringMenuPage() {
  const user = await requirePermission('catering.view');
  const items = await getCateringMenu(false);
  return (
    <MenuClient
      items={items}
      canManage={user.permissions.includes('catering.manage') || user.role === 'SUPER_ADMIN'}
    />
  );
}
