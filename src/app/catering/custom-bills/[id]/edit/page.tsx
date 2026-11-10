import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/session';
import { getCateringCustomBill, getCateringProfile, getCateringRules } from '@/lib/catering';
import { customBillWhatsAppText } from '@/lib/whatsapp';
import { CustomBillEditor } from '../../custom-bill-editor';

export const metadata = { title: 'Edit Bill — Catering' };
export const dynamic = 'force-dynamic';

export default async function EditCustomBillPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('catering.manage');
  const { id } = await params;
  const bill = await getCateringCustomBill(Number(id));
  if (!bill) notFound();
  const [profile, rules] = await Promise.all([getCateringProfile(), getCateringRules(true)]);
  // Built here, from the same figures the printed bill uses, so the WhatsApp
  // message and the shared PDF can never tell different stories.
  const message = customBillWhatsAppText(
    { billNo: bill.billNo, billTo: bill.billTo, billDate: bill.billDate, grandTotal: bill.grandTotal },
    {
      name: profile.name, person: profile.person, phone: profile.phone, address: profile.address,
      terms: profile.showTerms ? rules.map((r) => r.text).join('\n') : '',
    },
  );
  return <CustomBillEditor bill={bill} whatsappMessage={message} />;
}
