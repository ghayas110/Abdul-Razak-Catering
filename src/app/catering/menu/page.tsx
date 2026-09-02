import { requirePermission } from '@/lib/session';
import { getCateringMenu, getCateringCategories } from '@/lib/catering';
import { MenuClient } from './menu-client';

export const metadata = { title: 'Menu & Rates — Catering' };
export const dynamic = 'force-dynamic';

export default async function CateringMenuPage() {
  const user = await requirePermission('catering.view');
  const [items, categories] = await Promise.all([getCateringMenu(false), getCateringCategories(false)]);
  return (
    <MenuClient
      items={items}
      categories={categories}
      canManage={user.permissions.includes('catering.manage') || user.role === 'SUPER_ADMIN'}
    />
  );
}
