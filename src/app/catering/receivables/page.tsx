import { requirePermission } from '@/lib/session';
import { getCateringReceivables, getCateringReceivablesTotal, getCateringReceivablesOutstanding } from '@/lib/catering';
import { getDefaultPeriod } from '@/lib/data';
import { monthRange } from '@/lib/format';
import { ReceivablesClient } from './receivables-client';

export const metadata = { title: 'Receivables — Catering' };
export const dynamic = 'force-dynamic';

/**
 * A debt owed to the business that is not a quotation — a personal loan, a
 * gift promised in installments, anything worth keeping on record. Each one
 * is raised for a total amount and settled over one or more payments, the
 * same way a quotation is invoiced and then paid off.
 *
 * The list is scoped to the selected month (the same PeriodPicker every other
 * report in this portal uses) by when it was RAISED. The tickers above it are
 * actual cash collected — "this month" / "this year" / "all time" — plus
 * "Outstanding", which is unscoped by date because a debt someone owes is a
 * running balance, not a period.
 */
export default async function ReceivablesPage({
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
    getCateringReceivables(monthFrom, monthTo),
    getCateringReceivablesTotal(monthFrom, monthTo),
    getCateringReceivablesTotal(yearFrom, yearTo),
    getCateringReceivablesTotal(),
    getCateringReceivablesOutstanding(),
  ]);

  return (
    <ReceivablesClient
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
