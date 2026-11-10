import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/session';
import { getCateringCustomBill, getCateringProfile, getCateringRules } from '@/lib/catering';
import { getBrand } from '@/lib/data';
import { PrintShell } from '@/components/print/print-shell';
import { CustomBillDoc } from '@/components/print/print-docs';

export const metadata = { title: 'Custom Bill' };
export const dynamic = 'force-dynamic';

export default async function CustomBillPrint({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('catering.view');
  const { id } = await params;
  const [bill, profile, rules, brand] = await Promise.all([
    getCateringCustomBill(Number(id)),
    getCateringProfile(),
    getCateringRules(true),
    getBrand(),
  ]);
  if (!bill) notFound();

  return (
    <PrintShell backHref={`/catering/custom-bills/${id}/edit`}>
      <CustomBillDoc
        d={{
          billNo: bill.billNo,
          billTo: bill.billTo,
          contactNo: bill.contactNo,
          address: bill.address,
          billDate: bill.billDate,
          grandTotal: bill.grandTotal,
          note: bill.note,
          items: (bill.items ?? []).map((it) => ({
            section: it.section, description: it.description, qty: it.qty, unit: it.unit, rate: it.rate, amount: it.amount,
          })),
        }}
        p={profile}
        rules={profile.showTerms ? rules.map((r) => r.text) : []}
        brand={brand}
      />
    </PrintShell>
  );
}
