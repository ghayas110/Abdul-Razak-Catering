import { requirePermission } from '@/lib/session';
import { notFound } from 'next/navigation';
import { getCateringQuotation, getCateringMenu, getCateringCustomers, getCateringCategories } from '@/lib/catering';
import { QuotationEditor } from '../../quotation-editor';

export const metadata = { title: 'Edit Quotation — Catering' };
export const dynamic = 'force-dynamic';

export default async function EditCateringQuotation({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('catering.manage');
  const { id } = await params;
  const [q, menu, customers, categories] = await Promise.all([
    getCateringQuotation(Number(id)), getCateringMenu(true), getCateringCustomers(), getCateringCategories(false),
  ]);
  if (!q) notFound();
  return (
    <QuotationEditor
      quotation={q}
      menu={menu}
      customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      categories={categories}
    />
  );
}
