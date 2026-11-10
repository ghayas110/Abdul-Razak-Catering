import { requirePermission } from '@/lib/session';
import { getCateringCustomBills } from '@/lib/catering';
import { CustomBillsClient } from './custom-bills-client';

export const metadata = { title: 'Custom Bills — Catering' };
export const dynamic = 'force-dynamic';

/**
 * A bill with no dish behind it — a name, a date, and a list of charges.
 * Every line is a description and an amount, the same shape as a
 * quotation's CHARGE band, with nothing to look up from the menu. For
 * anything that doesn't fit the priced-quotation flow but still needs a
 * proper printed bill: a one-off service, a reimbursement, a private
 * arrangement.
 *
 * Not period-scoped like Receivables/Payables — these are one-off documents,
 * not a running ledger, so the whole list (most recent 200) loads at once and
 * a search box narrows it, matching how Quotations itself is browsed.
 */
export default async function CustomBillsPage() {
  const user = await requirePermission('catering.view');
  const bills = await getCateringCustomBills({ limit: 200 });

  return (
    <CustomBillsClient
      bills={bills}
      canManage={user.permissions.includes('catering.manage') || user.role === 'SUPER_ADMIN'}
    />
  );
}
