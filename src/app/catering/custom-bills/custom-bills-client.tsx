'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, SectionTitle, Button, Input, EmptyState, TableScroll, ConfirmModal } from '@/components/ui';
import { fmtMoney, fmtDate, cn } from '@/lib/format';
import { deleteCateringCustomBill } from '@/lib/actions/catering';
import type { CateringCustomBillRow } from '@/lib/types';
import { Plus, FilePlus2, Pencil, Trash2, Printer, Search } from 'lucide-react';

/**
 * One-off printed bills with nothing behind them but a name and a list of
 * charges — no menu, no customer record, no event. Browsed as one flat list
 * (most recent 200) with a client-side search, the same way Receivables and
 * Payables are, since these aren't month-scoped the way a ledger is.
 */
export function CustomBillsClient({ bills, canManage }: { bills: CateringCustomBillRow[]; canManage: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<CateringCustomBillRow | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return bills;
    return bills.filter((b) => `${b.billNo} ${b.billTo} ${b.contactNo}`.toLowerCase().includes(s));
  }, [q, bills]);

  function confirmDelete() {
    if (!deleting) return;
    const b = deleting;
    start(async () => {
      const res = await deleteCateringCustomBill(b.id);
      setDeleting(null);
      setNotice(res.ok ? (res.message ?? 'Deleted.') : (res.error ?? 'Failed.'));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Catering"
        sub="A printed bill with no menu behind it — a name, a date, and whatever charges belong on it."
        right={canManage ? (
          <Link href="/catering/custom-bills/new">
            <Button><Plus className="mr-1.5 h-4 w-4" /> New bill</Button>
          </Link>
        ) : undefined}
      >
        Custom Bills
      </SectionTitle>

      {notice && (
        <Card className="flex items-center justify-between gap-3 p-3 text-sm text-[rgb(var(--text-muted))]">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-xs text-gold hover:underline">Dismiss</button>
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-[rgb(var(--border)/0.4)] p-4">
          <div className="relative max-w-sm">
            <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors', q ? 'text-gold' : 'text-[rgb(var(--text-dim))]')} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bill no, name, contact…"
              className={cn('pl-9 transition-colors', q && 'pr-8 border-[rgb(var(--gold)/0.5)]')}
            />
            {q && (
              <button type="button" onClick={() => setQ('')} title="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[rgb(var(--text-dim))] transition-colors hover:bg-[rgb(var(--surface-2))] hover:text-negative">
                ×
              </button>
            )}
          </div>
        </div>

        {bills.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<FilePlus2 className="h-8 w-8" />} title="No custom bills yet" sub="A one-off bill that doesn't fit the quotation flow — a private arrangement, a reimbursement — goes here." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Search className="h-8 w-8" />} title="No bills match" sub={`Nothing matches "${q}".`} />
          </div>
        ) : (
          <TableScroll>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border)/0.6)] bg-[rgb(var(--surface-2))] text-left text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">
                  <th className="px-4 py-2.5 font-medium">Bill No</th>
                  <th className="px-4 py-2.5 font-medium">Bill To</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-[rgb(var(--border)/0.2)] last:border-0 hover:bg-[rgb(var(--surface-2)/0.4)]">
                    <td className="px-4 py-2.5 font-medium text-[rgb(var(--text))]">{b.billNo}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-[rgb(var(--text))]">{b.billTo}</div>
                      {b.contactNo && <div className="text-xs text-[rgb(var(--text-dim))]">{b.contactNo}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[rgb(var(--text-muted))]">{fmtDate(b.billDate)}</td>
                    <td className="px-4 py-2.5 text-right tnum text-[rgb(var(--text))]">{fmtMoney(b.grandTotal, false)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Link href={`/print/custom-bill/${b.id}`} target="_blank" title="Print"
                          className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-gold">
                          <Printer className="h-4 w-4" />
                        </Link>
                        {canManage && (
                          <>
                            <Link href={`/catering/custom-bills/${b.id}/edit`} title="Edit"
                              className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-gold">
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleting(b)} disabled={pending} title="Delete"
                              className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-negative disabled:opacity-40">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>

      <ConfirmModal
        open={!!deleting}
        title="Delete this bill?"
        message={deleting ? `Delete ${deleting.billNo}${deleting.billTo ? ` for ${deleting.billTo}` : ''}? This can't be undone.` : ''}
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
