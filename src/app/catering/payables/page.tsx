import { requirePermission } from '@/lib/session';
import { getCateringExpenses, getCateringExpensesTotal, getCateringExpensesOutstanding } from '@/lib/catering';
import { getDefaultPeriod } from '@/lib/data';
import { monthRange } from '@/lib/format';
import { PayablesClient } from './payables-client';

export const metadata = { title: 'Payables — Catering' };
export const dynamic = 'force-dynamic';

/**
 * A debt the business owes that isn't a vendor bill against one event — a
 * utility bill, a one-off service payment, equipment. Same shape as
 * Receivables, mirrored exactly: raised for a total, settled over one or
 * more payments. Named "Payables" on screen; kept on `catering_expenses`
 * underneath, because `catering_payables` already means something else in
 * this app (the per-event vendor bills behind "Vendor Bills" in the sidebar)
 * and reusing the table would collide the two.
 *
 * The list is scoped to the selected month by when it was RAISED. The
 * tickers above it are actual cash paid out — "this month" / "this year" /
 * "all time" — plus "Outstanding", unscoped by date because a debt the
 * business owes is a running balance, not a period.
 */
export default async function PayablesPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const user = await requirePermission('catering.reports');
  const sp = await searchParams;
  const def = await getDefaultPeriod();
  const year = Number(sp.y) || def.year;
  const month = Number(sp.m) || def.month;
  const { from: monthFrom, to: monthTo } = monthRange(year, month);
  const yearFrom = `${year}-01-01`;
  const yearTo = `${year}-12-31`;

  const [rows, monthTotal, yearTotal, allTimeTotal, outstandingTotal] = await Promise.all([
    getCateringExpenses(monthFrom, monthTo),
    getCateringExpensesTotal(monthFrom, monthTo),
    getCateringExpensesTotal(yearFrom, yearTo),
    getCateringExpensesTotal(),
    getCateringExpensesOutstanding(),
  ]);

  return (
    <PayablesClient
      year={year}
      month={month}
      rows={rows}
      monthTotal={monthTotal}
      yearTotal={yearTotal}
      allTimeTotal={allTimeTotal}
      outstandingTotal={outstandingTotal}
      canManage={user.permissions.includes('catering.manage') || user.role === 'SUPER_ADMIN'}
    />
  );
}
