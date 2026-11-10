import { requirePermission } from '@/lib/session';
import { CustomBillEditor } from '../custom-bill-editor';

export const metadata = { title: 'New Bill — Catering' };
export const dynamic = 'force-dynamic';

export default async function NewCustomBillPage() {
  await requirePermission('catering.manage');
  return <CustomBillEditor />;
}
