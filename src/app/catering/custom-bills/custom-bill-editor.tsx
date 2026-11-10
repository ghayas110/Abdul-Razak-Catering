'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, SectionTitle, Button, Field, Input, Textarea } from '@/components/ui';
import { DateInput } from '@/components/date-input';
import { SearchSelect } from '@/components/search-select';
import { WhatsAppMessageCard } from '@/components/whatsapp-message';
import { InvoiceShareButton } from '@/components/invoice-share';
import { fmtMoney } from '@/lib/format';
import { saveCateringCustomBill } from '@/lib/actions/catering';
import { UNIT_META, cateringLineAmount, type CateringCustomBillRow, type CateringSection, type CateringUnit } from '@/lib/types';
import { Plus, X, ArrowLeft, Save } from 'lucide-react';

type Item = { key: string; section: CateringSection; description: string; qty: string; unit: CateringUnit; rate: string; amount: string };
const unitOptions = (Object.keys(UNIT_META) as CateringUnit[]).map((u) => ({ value: u, label: UNIT_META[u].label }));
/** A CHARGE is its typed amount; an item line is qty x rate, same arithmetic as the server. */
const lineTotal = (it: Item) => it.section === 'CHARGE'
  ? Number(it.amount) || 0
  : cateringLineAmount(Number(it.qty) || 0, it.unit, Number(it.rate) || 0);

/**
 * Held in sessionStorage for the same reason the quotation editor's draft is:
 * an operator midway through a long list of charges should not lose it to an
 * accidental back-button or a refresh. See quotation-editor.tsx for the full
 * rationale on the hydration-safe restore pattern mirrored here.
 */
type Draft = {
  billTo: string; contactNo: string; address: string; billDate: string; note: string;
  items: Item[];
  savedAt: number;
};

const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const draftKey = (scope: string) => `catering-draft-custom-bill-${scope}`;

function readDraft(scope: string): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(draftKey(scope));
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d.savedAt || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(draftKey(scope));
      return null;
    }
    // A draft saved before bills had a Charges section has lines with no
    // section at all; they were item lines, so read them as such.
    d.items = (d.items ?? []).map((it) => ({ ...it, section: it.section ?? 'DISH', amount: it.amount ?? '' }));
    return d;
  } catch {
    return null;
  }
}

function clearDraft(scope: string) {
  try { window.sessionStorage.removeItem(draftKey(scope)); } catch { /* nothing to do */ }
}

const fingerprint = (d: Omit<Draft, 'savedAt'>) => JSON.stringify(d);
const uid = () => Math.random().toString(36).slice(2);
const todayISO = () => new Date().toISOString().slice(0, 10);
const blankItem = (section: CateringSection = 'DISH'): Item => ({
  key: uid(), section, description: '', qty: '', unit: 'KG', rate: '', amount: '',
});

export function CustomBillEditor({ bill, whatsappMessage }: {
  bill?: CateringCustomBillRow;
  /** Prefilled bill text, built on the server from the same figures as the printed bill. Only meaningful once the bill has been saved once — a draft has no id to print or share. */
  whatsappMessage?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const scope = bill ? String(bill.id) : 'new';

  const [pristine] = useState<Omit<Draft, 'savedAt'>>(() => ({
    billTo: bill?.billTo ?? '',
    contactNo: bill?.contactNo ?? '',
    address: bill?.address ?? '',
    billDate: bill?.billDate?.slice(0, 10) ?? todayISO(),
    note: bill?.note ?? '',
    items: (() => {
      const existing = bill?.items ?? [];
      if (existing.length === 0) return [blankItem()];
      return existing.map((it): Item => ({
        key: `i${it.id}`, section: it.section, description: it.description,
        qty: it.qty ? String(it.qty) : '', unit: it.unit, rate: it.rate ? String(it.rate) : '',
        amount: it.amount ? String(it.amount) : '',
      }));
    })(),
  }));

  const [restored, setRestored] = useState(false);
  const [billTo, setBillTo] = useState(pristine.billTo);
  const [contactNo, setContactNo] = useState(pristine.contactNo);
  const [address, setAddress] = useState(pristine.address);
  const [billDate, setBillDate] = useState(pristine.billDate);
  const [note, setNote] = useState(pristine.note);
  const [items, setItems] = useState<Item[]>(pristine.items);

  useEffect(() => {
    const d = readDraft(scope);
    if (!d) return;
    const { savedAt: _savedAt, ...body } = d;
    if (fingerprint(body) === fingerprint(pristine)) return;

    setRestored(true);
    setBillTo(body.billTo);
    setContactNo(body.contactNo);
    setAddress(body.address);
    setBillDate(body.billDate);
    setNote(body.note);
    setItems(body.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    const body: Omit<Draft, 'savedAt'> = { billTo, contactNo, address, billDate, note, items };
    try {
      if (fingerprint(body) === fingerprint(pristine)) clearDraft(scope);
      else window.sessionStorage.setItem(draftKey(scope), JSON.stringify({ ...body, savedAt: Date.now() }));
    } catch {
      // Private browsing and full quotas both throw here. Losing the draft is
      // survivable; breaking the editor is not.
    }
  }, [billTo, contactNo, address, billDate, note, items, pristine, scope]);

  function discardDraft() {
    clearDraft(scope);
    setRestored(false);
    setBillTo(pristine.billTo);
    setContactNo(pristine.contactNo);
    setAddress(pristine.address);
    setBillDate(pristine.billDate);
    setNote(pristine.note);
    setItems(pristine.items);
  }

  const setItem = (key: string, patch: Partial<Item>) =>
    setItems((its) => its.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const removeItem = (key: string) => setItems((its) => its.filter((it) => it.key !== key));

  const totals = useMemo(() => {
    const dishes = items.filter((it) => it.section === 'DISH').reduce((sum, it) => sum + lineTotal(it), 0);
    const charges = items.filter((it) => it.section === 'CHARGE').reduce((sum, it) => sum + lineTotal(it), 0);
    return { dishes, charges, grand: dishes + charges };
  }, [items]);

  function submit() {
    setError('');
    const payload = {
      billTo, contactNo, address, billDate, note,
      items: items
        .filter((it) => it.description.trim())
        .map((it) => ({
          section: it.section,
          description: it.description.trim(),
          qty: Number(it.qty) || 0, unit: it.unit, rate: Number(it.rate) || 0,
          amount: Number(it.amount) || 0,
        })),
    };
    start(async () => {
      const res = await saveCateringCustomBill(bill?.id ?? null, payload);
      if (res.ok) {
        clearDraft(scope);
        router.push('/catering/custom-bills');
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Catering"
        sub={bill ? `Editing ${bill.billNo}` : 'The bill number is issued automatically on save.'}
        right={
          <Link href="/catering/custom-bills">
            <Button variant="ghost"><ArrowLeft className="mr-1.5 h-4 w-4" /> Cancel</Button>
          </Link>
        }
      >
        {bill ? 'Edit bill' : 'New bill'}
      </SectionTitle>

      {error && <Card className="border-negative/30 bg-negative/10 p-3 text-sm text-negative">{error}</Card>}

      {restored && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-gold/30 bg-[rgb(var(--gold)/0.08)] p-3">
          <span className="text-sm text-[rgb(var(--text-muted))]">
            Your unsaved changes were kept. Nothing has been saved yet.
          </span>
          <Button variant="ghost" onClick={discardDraft}>Discard changes</Button>
        </Card>
      )}

      {bill && whatsappMessage && (
        <WhatsAppMessageCard
          title="Send bill on WhatsApp"
          subtitle={<>Opens WhatsApp with the bill ready to send.{bill.contactNo ? <span className="ml-1 text-[rgb(var(--text-dim))]">To {bill.contactNo}.</span> : null}</>}
          template={whatsappMessage}
          phone={bill.contactNo || null}
          noPhoneLabel="No phone number on this bill"
          extra={
            <div className="flex flex-wrap items-center gap-3">
              <InvoiceShareButton
                bookingId={bill.id}
                slipNo={bill.billNo}
                partyName={bill.billTo}
                phone={bill.contactNo || null}
                docLabel="Bill"
                printPath={`/print/custom-bill/${bill.id}`}
              />
              <span className="text-xs text-[rgb(var(--text-dim))]">
                Attaches the printable bill as a real PDF.
              </span>
            </div>
          }
        />
      )}

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Bill To"><Input value={billTo} onChange={(e) => setBillTo(e.target.value)} placeholder="Name" /></Field>
          <Field label="Contact no." hint="Optional"><Input value={contactNo} onChange={(e) => setContactNo(e.target.value)} placeholder="0300-1234567" /></Field>
          <Field label="Address" hint="Optional"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="4L Chowrangi" /></Field>
          <Field label="Bill date"><DateInput value={billDate} onChange={setBillDate} showDay={false} /></Field>
        </div>
      </Card>

      {/* Two bands, the same as a quotation: item lines priced qty x rate,
          then charges — transport, service — that are just an amount. */}
      {([
        { key: 'DISH', title: 'Items', hint: 'Description, quantity, unit and rate. The amount is worked out for you.', empty: 'No items on this bill.' },
        { key: 'CHARGE', title: 'Charges', hint: 'Transport, service, anything that is just an amount, with no quantity or rate.', empty: 'No charges on this bill.' },
      ] as { key: CateringSection; title: string; hint: string; empty: string }[]).map((sec) => {
        const rows = items.filter((it) => it.section === sec.key);
        return (
          <Card key={sec.key} className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display text-lg text-[rgb(var(--text))]">{sec.title}</div>
                <div className="text-xs text-[rgb(var(--text-dim))]">{sec.hint}</div>
              </div>
              <Button variant="ghost" onClick={() => setItems((its) => [...its, blankItem(sec.key)])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> {sec.key === 'CHARGE' ? 'Add charge' : 'Add item'}
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[rgb(var(--border))] px-4 py-6 text-center text-sm text-[rgb(var(--text-dim))]">
                {sec.empty}
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((it) => (
                  <div key={it.key} className="rounded-xl border border-[rgb(var(--border)/0.5)] p-2">
                    {sec.key === 'CHARGE' ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px] flex-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Description</label>
                          <Input value={it.description} onChange={(e) => setItem(it.key, { description: e.target.value })} placeholder="e.g. Transport" />
                        </div>
                        <div className="w-36">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Amount</label>
                          <Input type="number" min="0" value={it.amount} onChange={(e) => setItem(it.key, { amount: e.target.value })} className="text-right" />
                        </div>
                        <button onClick={() => removeItem(it.key)} title="Remove charge"
                          className="mb-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[rgb(var(--text-dim))] hover:text-negative sm:min-h-0 sm:min-w-0 sm:p-2">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 items-start gap-2">
                        <div className="col-span-12 sm:col-span-7">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Description</label>
                          <Input value={it.description} onChange={(e) => setItem(it.key, { description: e.target.value })} placeholder="e.g. Chicken Biryani" />
                        </div>
                        <div className="col-span-4 sm:col-span-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Qty</label>
                          <Input type="number" min="0" step="0.01" value={it.qty} onChange={(e) => setItem(it.key, { qty: e.target.value })} />
                        </div>
                        <div className="col-span-4 sm:col-span-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Unit</label>
                          <SearchSelect
                            options={unitOptions}
                            value={it.unit}
                            onChange={(v) => v && setItem(it.key, { unit: v as CateringUnit })}
                            placeholder="Unit…"
                            emptyLabel="Unit"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Rate</label>
                          <Input type="number" min="0" value={it.rate} onChange={(e) => setItem(it.key, { rate: e.target.value })} />
                        </div>
                        <div className="col-span-8 sm:col-span-1 text-right">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Amount</label>
                          <span className="tnum inline-block py-2 text-sm text-[rgb(var(--text))]">{fmtMoney(lineTotal(it), false)}</span>
                        </div>
                        {/* A finger-sized, labelled target on a phone; the bare icon
                            on a desktop. See the same block in quotation-editor.tsx. */}
                        <div className="col-span-4 sm:col-span-1">
                          <label aria-hidden className="mb-1 block text-[11px] uppercase tracking-wider opacity-0">·</label>
                          <div className="flex justify-end">
                            <button onClick={() => removeItem(it.key)} title="Remove line"
                              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-[rgb(var(--border)/0.6)] text-xs font-medium text-[rgb(var(--text-dim))] transition-colors hover:border-negative/40 hover:text-negative sm:min-h-0 sm:w-auto sm:border-0 sm:p-2">
                              <X className="h-4 w-4" />
                              <span className="sm:hidden">Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      <Card className="p-5">
        <div className="ml-auto max-w-sm space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-[rgb(var(--text-dim))]">Items</span><span className="tnum">{fmtMoney(totals.dishes)}</span></div>
          <div className="flex justify-between"><span className="text-[rgb(var(--text-dim))]">Charges</span><span className="tnum">{fmtMoney(totals.charges)}</span></div>
          <div className="flex justify-between border-t border-[rgb(var(--border)/0.5)] pt-1.5 font-medium"><span>Grand total</span><span className="tnum text-gold">{fmtMoney(totals.grand)}</span></div>
        </div>
        <Field label="Note" hint="Prints under the charges on the bill">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit} disabled={pending || !billTo.trim()}>
            <Save className="mr-1.5 h-4 w-4" />
            {pending ? 'Saving…' : bill ? 'Save changes' : 'Create bill'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
