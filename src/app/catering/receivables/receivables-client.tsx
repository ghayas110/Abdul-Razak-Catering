'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, SectionTitle, Button, Field, Input, Select, Textarea, Modal, EmptyState, TableScroll, Badge, ConfirmModal,
} from '@/components/ui';
import { StatTile } from '@/components/stat-tile';
import { DateInput } from '@/components/date-input';
import { PeriodPicker } from '@/components/period-picker';
import { fmtMoney, fmtDate, monthLabelFull, cn } from '@/lib/format';
import {
  saveCateringReceivable, deleteCateringReceivable, recordCateringReceivablePayment,
  addCateringReceivableAmount,
} from '@/lib/actions/catering';
import { CATERING_RECEIVABLE_STATUS_META, type CateringReceivableRow } from '@/lib/types';
import { Plus, Pencil, Trash2, HandCoins, CalendarRange, CalendarDays, Wallet, AlertCircle, Search, MinusCircle, PlusCircle } from 'lucide-react';

const METHODS = ['CASH', 'BANK', 'EASYPAISA', 'JAZZCASH', 'OTHER'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = { payerName: '', amount: '', receivedDate: todayISO(), note: '', advance: '', advanceMethod: 'CASH' };
const EMPTY_PAYMENT = { amount: '', paymentDate: todayISO(), method: 'CASH', note: '' };
const EMPTY_ADD = { amount: '', note: '' };

/**
 * A debt owed to the business, raised for a total amount and settled over one
 * or more payments — a father who says he'll pay in installments, a one-off
 * contact who pays half now and half later. This is the same shape as a
 * quotation and its payments, just lighter weight.
 */
export function ReceivablesClient({
  year, month, rows, monthTotal, yearTotal, allTimeTotal, outstandingTotal, canManage,
}: {
  year: number; month: number;
  rows: CateringReceivableRow[];
  monthTotal: number; yearTotal: number; allTimeTotal: number; outstandingTotal: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CateringReceivableRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();

  // Recording a payment against an existing receivable is a second, smaller
  // modal — kept separate from the create/edit one so "how much is still
  // owed" is always on screen while typing the payment in.
  const [payFor, setPayFor] = useState<CateringReceivableRow | null>(null);
  const [payForm, setPayForm] = useState(EMPTY_PAYMENT);
  const [payError, setPayError] = useState('');

  // A THIRD small modal — separate from both create/edit and record-payment —
  // for growing an existing total. Kept apart from "Edit" on purpose: editing
  // corrects a mistake already on the record, this adds a fresh charge on
  // top of it, and the two should never be confused for one another.
  const [addFor, setAddFor] = useState<CateringReceivableRow | null>(null);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [addError, setAddError] = useState('');

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setPay = (k: keyof typeof EMPTY_PAYMENT, v: string) => setPayForm((f) => ({ ...f, [k]: v }));
  const setAdd = (k: keyof typeof EMPTY_ADD, v: string) => setAddForm((f) => ({ ...f, [k]: v }));

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setError(''); setOpen(true); }
  function openEdit(r: CateringReceivableRow) {
    setEditing(r);
    setForm({
      payerName: r.payerName, amount: String(r.amount), receivedDate: r.receivedDate.slice(0, 10),
      note: r.note, advance: '', advanceMethod: 'CASH',
    });
    setError(''); setOpen(true);
  }

  function openPayment(r: CateringReceivableRow) {
    setPayFor(r); setPayForm({ ...EMPTY_PAYMENT, amount: String(r.balance) }); setPayError('');
  }

  function openAdd(r: CateringReceivableRow) {
    setAddFor(r); setAddForm(EMPTY_ADD); setAddError('');
  }

  function submitAdd() {
    if (!addFor) return;
    setAddError('');
    start(async () => {
      const res = await addCateringReceivableAmount(addFor.id, {
        amount: Number(addForm.amount) || 0, note: addForm.note || null,
      });
      if (res.ok) { setAddFor(null); setNotice(res.message ?? 'Added.'); router.refresh(); }
      else setAddError(res.error);
    });
  }

  async function submit() {
    setError('');
    start(async () => {
      const res = await saveCateringReceivable(editing?.id ?? null, {
        payerName: form.payerName, amount: Number(form.amount) || 0,
        receivedDate: form.receivedDate, note: form.note,
      });
      if (!res.ok) { setError(res.error); return; }

      // An advance typed in at creation time is just the first payment,
      // recorded the moment the receivable exists so it never shows as fully
      // outstanding even for an instant.
      const advance = Number(form.advance) || 0;
      if (!editing && advance > 0 && res.id) {
        const payRes = await recordCateringReceivablePayment(res.id, {
          amount: advance, paymentDate: form.receivedDate, method: form.advanceMethod, note: 'Advance received at the time this was raised',
        });
        if (!payRes.ok) { setError(payRes.error); return; }
      }
      setOpen(false);
      setNotice(res.message ?? 'Saved.');
      router.refresh();
    });
  }

  function submitPayment() {
    if (!payFor) return;
    setPayError('');
    start(async () => {
      const res = await recordCateringReceivablePayment(payFor.id, {
        amount: Number(payForm.amount) || 0, paymentDate: payForm.paymentDate,
        method: payForm.method, note: payForm.note || null,
      });
      if (res.ok) { setPayFor(null); setNotice(res.message ?? 'Payment recorded.'); router.refresh(); }
      else setPayError(res.error);
    });
  }

  const [deleting, setDeleting] = useState<CateringReceivableRow | null>(null);

  function confirmDelete() {
    if (!deleting) return;
    const r = deleting;
    start(async () => {
      const res = await deleteCateringReceivable(r.id);
      setDeleting(null);
      setNotice(res.ok ? (res.message ?? 'Deleted.') : (res.error ?? 'Failed.'));
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.payerName} ${r.note}`.toLowerCase().includes(s));
  }, [q, rows]);
  const filteredTotal = filtered.reduce((sum, r) => sum + r.paidAmount, 0);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Catering"
        sub="A debt owed to the business — a personal loan, a gift promised in installments. Raised for a total, settled over one or more payments."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker year={year} month={month} />
            {canManage && <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Raise a receivable</Button>}
          </div>
        }
      >
        Amount Receivable
      </SectionTitle>

      {notice && (
        <Card className="flex items-center justify-between gap-3 p-3 text-sm text-[rgb(var(--text-muted))]">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-xs text-gold hover:underline">Dismiss</button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={monthLabelFull(year, month)} value={monthTotal} icon={<CalendarDays className="h-5 w-5" />} delay={0} sub="Actually collected" />
        <StatTile label={`${year} so far`} value={yearTotal} tone="green" icon={<CalendarRange className="h-5 w-5" />} delay={0.05} />
        <StatTile label="All time" value={allTimeTotal} tone="plain" icon={<Wallet className="h-5 w-5" />} delay={0.1} />
        <StatTile label="Outstanding" value={outstandingTotal} tone={outstandingTotal > 0 ? 'red' : 'green'} icon={<AlertCircle className="h-5 w-5" />} delay={0.15} sub="Still owed, right now" />
      </div>

      <Card className="p-0">
        <div className="border-b border-[rgb(var(--border)/0.4)] p-4">
          <div className="relative max-w-sm">
            <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors', q ? 'text-gold' : 'text-[rgb(var(--text-dim))]')} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search who owes, or the note…"
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

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<HandCoins className="h-8 w-8" />} title="Nothing raised this month" sub="A debt owed to the business, outside a quotation, goes here." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Search className="h-8 w-8" />} title="No entries match" sub={`Nothing this month matches "${q}".`} />
          </div>
        ) : (
          <TableScroll>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border)/0.6)] bg-[rgb(var(--surface-2))] text-left text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-right font-medium">Paid</th>
                  <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                  {canManage && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[rgb(var(--border)/0.2)] last:border-0 hover:bg-[rgb(var(--surface-2)/0.4)]">
                    <td className="px-4 py-2.5 text-[rgb(var(--text-muted))]">{fmtDate(r.receivedDate)}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-[rgb(var(--text))]">{r.payerName}</div>
                      {r.note && <div className="max-w-xs truncate text-xs text-[rgb(var(--text-dim))]" title={r.note}>{r.note}</div>}
                    </td>
                    <td className="px-4 py-2.5"><Badge tone={CATERING_RECEIVABLE_STATUS_META[r.status].tone}>{CATERING_RECEIVABLE_STATUS_META[r.status].label}</Badge></td>
                    <td className="px-4 py-2.5 text-right tnum text-[rgb(var(--text))]">{fmtMoney(r.amount, false)}</td>
                    <td className="px-4 py-2.5 text-right tnum text-positive">{fmtMoney(r.paidAmount, false)}</td>
                    <td className={`px-4 py-2.5 text-right tnum ${r.balance > 0 ? 'text-negative' : 'text-[rgb(var(--text-dim))]'}`}>{r.balance > 0 ? fmtMoney(r.balance, false) : '—'}</td>
                    {canManage && (
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openAdd(r)} disabled={pending} title="Add to the total"
                            className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-gold disabled:opacity-40">
                            <PlusCircle className="h-4 w-4" />
                          </button>
                          {r.balance > 0 && (
                            <button onClick={() => openPayment(r)} disabled={pending} title="Record a payment"
                              className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-positive disabled:opacity-40">
                              <MinusCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(r)} disabled={pending} title="Edit"
                            className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-gold disabled:opacity-40">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleting(r)} disabled={pending} title="Delete"
                            className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-negative disabled:opacity-40">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[rgb(var(--border)/0.5)] font-medium">
                  <td colSpan={4} className="px-4 py-2.5 text-right text-[rgb(var(--text-dim))]">
                    {q ? 'Paid so far (filtered)' : 'Paid so far'}
                  </td>
                  <td className="px-4 py-2.5 text-right tnum text-positive">{fmtMoney(filteredTotal, false)}</td>
                  <td />
                  {canManage && <td />}
                </tr>
              </tfoot>
            </table>
          </TableScroll>
        )}
      </Card>

      <p className="text-xs text-[rgb(var(--text-dim))]">
        Only what's actually been paid is folded into Profit on the Reports page and the printed catering
        report — an unpaid receivable doesn't count until it does.
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit receivable' : 'Raise a receivable'}>
        <div className="space-y-4">
          {error && <div className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">{error}</div>}
          <Field label="Owed by" hint="Who actually owes it — a name is enough">
            <Input value={form.payerName} onChange={(e) => set('payerName', e.target.value)} placeholder="e.g. Abbu, or Ahmed from next door" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total amount">
              <Input type="number" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Date raised">
              <DateInput value={form.receivedDate} onChange={(v) => set('receivedDate', v)} showDay={false} />
            </Field>
          </div>
          <Field label="Note" hint="What it was for — optional, but useful six months from now">
            <Textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Personal loan, to be paid back in installments" />
          </Field>
          {!editing && (
            <div className="rounded-xl border border-[rgb(var(--border)/0.5)] p-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[rgb(var(--text-dim))]">
                Advance received now — optional
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Amount">
                  <Input type="number" min="0" value={form.advance} onChange={(e) => set('advance', e.target.value)} placeholder="0" />
                </Field>
                <Field label="Method">
                  <Select value={form.advanceMethod} onChange={(e) => set('advanceMethod', e.target.value)}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </Field>
              </div>
              <p className="mt-2 text-xs text-[rgb(var(--text-dim))]">
                If something's already come in — say 10,000 of a 50,000 total — put it here. Otherwise leave
                it at 0 and record payments as they arrive.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={pending || !form.payerName.trim() || !(Number(form.amount) > 0)}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Raise it'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `Payment from ${payFor.payerName}` : 'Payment'}>
        {payFor && (
          <div className="space-y-4">
            <div className="flex justify-between rounded-xl border border-[rgb(var(--border)/0.5)] bg-[rgb(var(--surface-2))] p-3 text-sm">
              <span className="text-[rgb(var(--text-dim))]">Total {fmtMoney(payFor.amount)} · Paid {fmtMoney(payFor.paidAmount)}</span>
              <span className="font-medium text-negative">{fmtMoney(payFor.balance)} outstanding</span>
            </div>
            {payError && <div className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">{payError}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount">
                <Input type="number" min="0" max={payFor.balance} value={payForm.amount} onChange={(e) => setPay('amount', e.target.value)} />
              </Field>
              <Field label="Date">
                <DateInput value={payForm.paymentDate} onChange={(v) => setPay('paymentDate', v)} showDay={false} />
              </Field>
            </div>
            <Field label="Method">
              <Select value={payForm.method} onChange={(e) => setPay('method', e.target.value)}>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Note" hint="Optional">
              <Input value={payForm.note} onChange={(e) => setPay('note', e.target.value)} placeholder="e.g. 3rd installment" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button onClick={submitPayment} disabled={pending || !(Number(payForm.amount) > 0)}>
                {pending ? 'Saving…' : 'Record payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!addFor} onClose={() => setAddFor(null)} title={addFor ? `Add to ${addFor.payerName}'s total` : 'Add amount'}>
        {addFor && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[rgb(var(--border)/0.5)] bg-[rgb(var(--surface-2))] p-3 text-sm text-[rgb(var(--text-dim))]">
              Currently owed: <span className="font-medium text-[rgb(var(--text))]">{fmtMoney(addFor.amount)}</span>.
              This adds a fresh charge on top — it doesn't touch what's already been paid.
            </div>
            {addError && <div className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">{addError}</div>}
            <Field label="Amount to add">
              <Input type="number" min="0" value={addForm.amount} onChange={(e) => setAdd('amount', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Note" hint="What the extra amount is for — optional">
              <Input value={addForm.note} onChange={(e) => setAdd('note', e.target.value)} placeholder="e.g. Extra he agreed to send" />
            </Field>
            {Number(addForm.amount) > 0 && (
              <p className="text-xs text-[rgb(var(--text-dim))]">
                New total will be <span className="text-gold">{fmtMoney(addFor.amount + Number(addForm.amount))}</span>.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAddFor(null)}>Cancel</Button>
              <Button onClick={submitAdd} disabled={pending || !(Number(addForm.amount) > 0)}>
                {pending ? 'Saving…' : 'Add to total'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleting}
        title="Delete this entry?"
        message={
          deleting && deleting.paidAmount > 0
            ? `${deleting.payerName} has already paid ${fmtMoney(deleting.paidAmount)} against this. Deleting removes the whole record, payment history included.`
            : deleting
              ? `Delete the ${fmtMoney(deleting.amount)} entry for ${deleting.payerName}? This can't be undone.`
              : ''
        }
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
