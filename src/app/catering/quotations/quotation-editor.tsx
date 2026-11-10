'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card, SectionTitle, Button, Field, Input, Textarea,
} from '@/components/ui';
import { DateInput } from '@/components/date-input';
import { SearchSelect } from '@/components/search-select';
import { DishCombobox } from '@/components/dish-combobox';
import { fmtMoney } from '@/lib/format';
import { saveCateringQuotation, saveCateringTemplate } from '@/lib/actions/catering';
import {
  CATERING_STATUS_META, UNIT_META, unitsFor, cateringLineAmount,
  type CateringLineRow, type CateringMenuItemRow,
  type CateringQuotationRow, type CateringSection, type CateringStatus, type CateringTemplateRow,
  type CateringUnit,
} from '@/lib/types';
import { Plus, X, ArrowLeft, Save } from 'lucide-react';

type Line = {
  key: string;
  section: CateringSection;
  menuItemId: number | null;
  description: string;
  qty: string;
  unit: CateringUnit;
  rate: string;
  amount: string;
};

/**
 * Everything typed into the form, as one object.
 *
 * Held in sessionStorage so walking off to Menu & Rates to check or change a
 * price and coming back does not throw the form away. sessionStorage rather
 * than localStorage on purpose: a draft should survive navigation, not
 * reappear weeks later on a different day's work.
 */
type Draft = {
  customerId: string; customerName: string; contactNo: string; placeOfFunction: string;
  quotationDate: string; deliveryDate: string; persons: string;
  status: CateringStatus; advance: string; note: string;
  templateName: string; templateDesc: string;
  lines: Line[];
  /** Epoch millis. Stale drafts are ignored; see `readDraft`. */
  savedAt: number;
};

/**
 * How long an unsaved draft is worth keeping.
 *
 * The point of the draft is to survive walking off to Menu & Rates and back,
 * not to resurrect a quotation abandoned yesterday. Restoring one of those
 * into a fresh form is worse than losing it: the operator believes they are
 * starting clean and does not notice the stale lines.
 */
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const draftKey = (scope: string) => `catering-draft-${scope}`;

function readDraft(scope: string): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(draftKey(scope));
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d.savedAt || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) {
      // Too old to be the work in progress it was meant to protect.
      window.sessionStorage.removeItem(draftKey(scope));
      return null;
    }
    return d;
  } catch {
    // A malformed or unreadable draft must never stop the editor opening.
    return null;
  }
}

function clearDraft(scope: string) {
  try { window.sessionStorage.removeItem(draftKey(scope)); } catch { /* nothing to do */ }
}

/**
 * The comparable part of a draft: everything except when it was written.
 *
 * Used to tell an edited form from an untouched one. Without it, simply
 * OPENING a saved quotation writes a draft identical to the stored record, and
 * the next visit announces "unsaved changes restored" over work nobody did.
 */
const fingerprint = (d: Omit<Draft, 'savedAt'>) => JSON.stringify(d);

const uid = () => Math.random().toString(36).slice(2);
const todayISO = () => new Date().toISOString().slice(0, 10);
const blank = (section: CateringSection): Line => ({
  key: uid(), section, menuItemId: null, description: '',
  qty: '', unit: 'KG', rate: '', amount: '',
});

/**
 * A CHARGE line is the amount as typed; a DISH converts the quantity to the
 * rate's base unit first, so 500 g of a dish rated per kg bills correctly.
 * Shares `cateringLineAmount` with the server action and the slip, so the
 * three can never disagree.
 */
const lineTotal = (l: Line) =>
  l.section === 'CHARGE' ? Number(l.amount) || 0 : cateringLineAmount(Number(l.qty) || 0, l.unit, Number(l.rate) || 0);

/**
 * The line editor, used for both quotations and templates.
 *
 * A template is the same set of lines without the document around it: no
 * customer, no dates, no money taken. Rather than maintain a second editor
 * that would drift out of step over every menu change, this one drops the
 * document fields in template mode and saves to the other action.
 *
 * ── On form state ──
 *
 * Two rules, both of which this editor exists to keep:
 *
 *   1. Nothing on the form is ever DERIVED from the menu after the moment the
 *      operator picks a dish. Picking QORMA fills the description, the unit and
 *      the rate ONCE; from then on those fields belong to the operator. An
 *      earlier version generated a second "meat supplied" line per dish and
 *      kept it in step with the menu on every render, which silently rewrote
 *      rows the operator had already typed. That whole mechanism is gone.
 *
 *   2. Leaving the page does not lose the form. Every keystroke is mirrored
 *      into sessionStorage, so going to Menu & Rates to change a price and
 *      coming back returns to the quotation exactly as it was left — including
 *      lines whose dish has since been re-priced, because a quotation is a
 *      price already given, not a live view of the rate card.
 */
export function QuotationEditor({
  quotation, template, mode = 'QUOTATION', presetLines, presetPersons, menu, customers,
}: {
  quotation?: CateringQuotationRow;
  template?: CateringTemplateRow;
  mode?: 'QUOTATION' | 'TEMPLATE';
  /** Lines copied in from a template when starting a fresh quotation. */
  presetLines?: CateringLineRow[];
  presetPersons?: number;
  menu: CateringMenuItemRow[];
  customers: { id: number; name: string; phone: string }[];
}) {
  const isTemplate = mode === 'TEMPLATE';
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  /**
   * Which draft this editor owns.
   *
   * Scoped by document AND by mode, so editing template 3 cannot restore its
   * lines into quotation 3, and the new-quotation form does not collide with
   * the new-template form.
   */
  const scope = isTemplate
    ? `template-${template?.id ?? 'new'}`
    : `quotation-${quotation?.id ?? 'new'}`;

  /**
   * What the server sent, before anyone typed anything.
   *
   * Built once and kept, because it is both the initial state and the thing a
   * draft is compared against to decide whether there is anything to restore.
   */
  const [pristine] = useState<Omit<Draft, 'savedAt'>>(() => ({
    customerId: quotation?.customerId ? String(quotation.customerId) : '',
    customerName: quotation?.customerName ?? '',
    contactNo: quotation?.contactNo ?? '',
    placeOfFunction: quotation?.placeOfFunction ?? '',
    quotationDate: quotation?.quotationDate?.slice(0, 10) ?? todayISO(),
    deliveryDate: quotation?.deliveryDate?.slice(0, 10) ?? '',
    persons: quotation?.persons ? String(quotation.persons)
      : template?.persons ? String(template.persons)
        : presetPersons ? String(presetPersons) : '',
    status: quotation?.status ?? 'QUOTATION',
    advance: quotation?.advanceAmount ? String(quotation.advanceAmount) : '',
    note: quotation?.note ?? template?.note ?? '',
    templateName: template?.name ?? '',
    templateDesc: template?.description ?? '',
    lines: (() => {
      // `presetLines` arrives when a template is being applied to a new
      // quotation; `template.lines` when the template itself is being edited.
      const existing = quotation?.lines ?? template?.lines ?? presetLines ?? [];
      if (existing.length === 0) return [blank('DISH')];
      return existing.map((l): Line => ({
        key: `l${l.id}`, section: l.section, menuItemId: l.menuItemId,
        description: l.description,
        qty: l.qty ? String(l.qty) : '', unit: l.unit,
        rate: l.rate ? String(l.rate) : '', amount: l.amount ? String(l.amount) : '',
      }));
    })(),
  }));

  /**
   * Every field starts from `pristine` — what the server sent — and NOTHING
   * else, so the very first client render matches the server-rendered HTML
   * exactly. A saved draft is real, but `sessionStorage` does not exist on the
   * server: seeding state from it here, during the initial render, made the
   * client's first paint disagree with the server's and React discarded the
   * whole tree with a hydration error every time a draft existed — which,
   * for the one form in this app that is SUPPOSED to carry drafts, was often.
   *
   * The draft is instead pulled in by the effect below, which by definition
   * only ever runs on the client, after hydration has already succeeded.
   */
  const [restored, setRestored] = useState(false);

  const [templateName, setTemplateName] = useState(pristine.templateName);
  const [templateDesc, setTemplateDesc] = useState(pristine.templateDesc);
  const [customerId, setCustomerId] = useState(pristine.customerId);
  const [customerName, setCustomerName] = useState(pristine.customerName);
  const [contactNo, setContactNo] = useState(pristine.contactNo);
  const [placeOfFunction, setPlaceOfFunction] = useState(pristine.placeOfFunction);
  const [quotationDate, setQuotationDate] = useState(pristine.quotationDate);
  const [deliveryDate, setDeliveryDate] = useState(pristine.deliveryDate);
  const [persons, setPersons] = useState(pristine.persons);
  const [status, setStatus] = useState<CateringStatus>(pristine.status);
  const [advance, setAdvance] = useState(pristine.advance);
  const [note, setNote] = useState(pristine.note);
  const [lines, setLines] = useState<Line[]>(pristine.lines);

  /**
   * Pull in a saved draft, once, after the page the server sent has already
   * hydrated. A draft that matches `pristine` exactly is not a restore — it
   * is the same document — so it is discarded here rather than announced.
   *
   * `pristine` is deliberately left out of the dependency list: it is built
   * once via its own `useState` initializer and never changes for the life of
   * this component, and re-running this on some later, unrelated render would
   * re-apply a draft the operator may have already edited past.
   */
  useEffect(() => {
    const d = readDraft(scope);
    if (!d) return;
    const { savedAt: _savedAt, ...body } = d;
    if (fingerprint(body) === fingerprint(pristine)) return;

    setRestored(true);
    setTemplateName(body.templateName);
    setTemplateDesc(body.templateDesc);
    setCustomerId(body.customerId);
    setCustomerName(body.customerName);
    setContactNo(body.contactNo);
    setPlaceOfFunction(body.placeOfFunction);
    setQuotationDate(body.quotationDate);
    setDeliveryDate(body.deliveryDate);
    setPersons(body.persons);
    setStatus(body.status);
    setAdvance(body.advance);
    setNote(body.note);
    setLines(body.lines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  /**
   * Patch ONE line. Every other line, and every field outside the grid, is
   * left untouched by construction — this is rule 1 above, enforced by there
   * being no other writer of `lines` than the row the operator is in.
   */
  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  /**
   * Picking a dish fills the description, the unit and the rate from the menu.
   *
   * This runs on the pick and never again. If Menu & Rates later re-prices the
   * dish, this line keeps the rate that was quoted; the operator re-picks the
   * dish when they want the new one.
   */
  function pickMenu(key: string, id: number | null) {
    const m = menu.find((x) => x.id === id);
    if (!m) { setLine(key, { menuItemId: null }); return; }
    setLine(key, {
      menuItemId: m.id,
      description: m.name,
      unit: m.unit,
      rate: String(m.rate),
    });
  }

  const menuOptions = menu.map((m) => ({
    value: m.id,
    label: m.name,
    sub: `per ${UNIT_META[m.unit].label}`,
    right: m.rate ? fmtMoney(m.rate, false) : undefined,
  }));

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name, sub: c.phone || undefined }));

  /**
   * The units this line may be counted in.
   *
   * Its own measure first — a dish priced per kg is nearly always ordered in
   * kg or g — but every other unit is offered underneath, because a dish's
   * unit is a decision the kitchen revises. This used to offer the current
   * measure ALONE, which trapped a per-plate line: PLATE is a count and counts
   * do not convert, so the list came back holding one entry and the only way
   * off it was to delete the row.
   */
  const unitOptionsFor = (l: Line) => {
    const own = unitsFor(UNIT_META[l.unit].base);
    const rest = (Object.keys(UNIT_META) as CateringUnit[]).filter((u) => !own.includes(u));
    return [...own, ...rest].map((u) => ({ value: u, label: UNIT_META[u].label }));
  };

  /**
   * What the menu says about this line TODAY, where that disagrees with the
   * line itself.
   *
   * Nothing here is applied automatically. A quotation is a price already
   * given, and rewriting one because a rate card moved underneath it is the
   * behaviour this editor exists to prevent. But the operator who just went to
   * Menu & Rates, changed a dish from per plate to per kg, and came back needs
   * to SEE that the line is now out of step and be able to pull the change in
   * with one click. Silence was the actual complaint.
   *
   * Only a change of MEASURE counts as a drifted unit: a line entered in grams
   * against a per-kg dish is the operator's own choice, not drift.
   */
  function menuDrift(l: Line): { unit?: CateringUnit; rate?: string } | null {
    if (l.section !== 'DISH' || !l.menuItemId) return null;
    const m = menu.find((x) => x.id === l.menuItemId);
    if (!m) return null;
    const current = String(m.rate);

    const out: { unit?: CateringUnit; rate?: string } = {};
    if (UNIT_META[m.unit].base !== UNIT_META[l.unit].base) out.unit = m.unit;
    // An untouched rate has nothing to disagree with yet.
    if (l.rate !== '' && current !== '0' && current !== l.rate) out.rate = current;
    return out.unit || out.rate ? out : null;
  }


  function removeLine(key: string) {
    setLines((ls) => ls.filter((l) => l.key !== key));
  }

  /**
   * Mirror the form into sessionStorage whenever anything changes.
   *
   * Cheap enough to do on every keystroke: one small JSON blob written
   * synchronously, and the alternative (debouncing) risks losing the last few
   * characters typed before navigating away — which is exactly the moment this
   * exists to protect.
   *
   * A form that still matches what the server sent writes nothing and clears
   * any earlier draft, so an untouched document never claims to have unsaved
   * changes and "Discard changes" leaves nothing behind.
   */
  useEffect(() => {
    const body: Omit<Draft, 'savedAt'> = {
      customerId, customerName, contactNo, placeOfFunction,
      quotationDate, deliveryDate, persons, status, advance, note,
      templateName, templateDesc, lines,
    };
    try {
      if (fingerprint(body) === fingerprint(pristine)) clearDraft(scope);
      else window.sessionStorage.setItem(draftKey(scope), JSON.stringify({ ...body, savedAt: Date.now() }));
    } catch {
      // Private browsing and full quotas both throw here. Losing the draft is
      // survivable; breaking the editor is not.
    }
  }, [customerId, customerName, contactNo, placeOfFunction, quotationDate,
    deliveryDate, persons, status, advance, note, templateName, templateDesc,
    lines, pristine, scope]);

  /**
   * Throw the draft away and go back to what is actually saved.
   *
   * Every field is restored from `pristine` in place rather than by reloading:
   * the values are already here, and a reload would cost a round trip to show
   * the operator something this component can produce immediately.
   */
  function discardDraft() {
    clearDraft(scope);
    setRestored(false);
    setTemplateName(pristine.templateName);
    setTemplateDesc(pristine.templateDesc);
    setCustomerId(pristine.customerId);
    setCustomerName(pristine.customerName);
    setContactNo(pristine.contactNo);
    setPlaceOfFunction(pristine.placeOfFunction);
    setQuotationDate(pristine.quotationDate);
    setDeliveryDate(pristine.deliveryDate);
    setPersons(pristine.persons);
    setStatus(pristine.status);
    setAdvance(pristine.advance);
    setNote(pristine.note);
    setLines(pristine.lines);
  }

  const totals = useMemo(() => {
    const items = lines.filter((l) => l.section === 'DISH').reduce((s, l) => s + lineTotal(l), 0);
    const charges = lines.filter((l) => l.section === 'CHARGE').reduce((s, l) => s + lineTotal(l), 0);
    return { items, charges, grand: items + charges };
  }, [lines]);

  function submit() {
    setError('');

    if (isTemplate) {
      start(async () => {
        const res = await saveCateringTemplate(template?.id ?? null, {
          name: templateName,
          description: templateDesc,
          persons: Number(persons) || 0,
          note,
          lines: lines
            .filter((l) => l.description.trim())
            .map((l) => ({
              section: l.section, menuItemId: l.menuItemId,
              description: l.description.trim(),
              qty: Number(l.qty) || 0, unit: l.unit,
              rate: Number(l.rate) || 0, amount: Number(l.amount) || 0,
            })),
        });
        if (res.ok) {
          clearDraft(scope);
          router.push('/catering/templates');
        } else setError(res.error);
      });
      return;
    }

    const payload = {
      customerId: customerId ? Number(customerId) : null,
      customerName, contactNo, placeOfFunction,
      quotationDate, deliveryDate,
      persons: Number(persons) || 0,
      status,
      advanceAmount: Number(advance) || 0,
      note: note || null,
      lines: lines
        .filter((l) => l.description.trim())
        .map((l) => ({
          section: l.section, menuItemId: l.menuItemId,
          description: l.description.trim(),
          qty: Number(l.qty) || 0, unit: l.unit,
          rate: Number(l.rate) || 0, amount: Number(l.amount) || 0,
        })),
    };
    start(async () => {
      const res = await saveCateringQuotation(quotation?.id ?? null, payload);
      if (res.ok) {
        // Saved: the draft has served its purpose and must not shadow the
        // stored record next time this editor opens.
        clearDraft(scope);
        router.push(`/catering/quotations/${res.id}`);
      } else setError(res.error);
    });
  }

  const sections: { key: CateringSection; title: string; hint: string }[] = [
    { key: 'DISH', title: 'Dishes', hint: 'The numbered items on the slip' },
    { key: 'CHARGE', title: 'Charges', hint: 'Transport, service — an amount with no qty or rate' },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Catering"
        sub={isTemplate
          ? 'A saved set of lines. Applying it fills a new quotation; the quotation then goes its own way.'
          : quotation ? `Editing ${quotation.quotaNo}`
            : presetLines?.length ? 'Started from a template. Edit anything before saving.'
              : 'The quotation number is issued automatically on save.'}
        right={
          <Link href={isTemplate ? '/catering/templates'
            : quotation ? `/catering/quotations/${quotation.id}` : '/catering/quotations'}>
            <Button variant="ghost"><ArrowLeft className="mr-1.5 h-4 w-4" /> Cancel</Button>
          </Link>
        }
      >
        {isTemplate ? (template ? 'Edit template' : 'New template') : (quotation ? 'Edit quotation' : 'New quotation')}
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

      {isTemplate ? (
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Template name" hint="What you will pick it by, e.g. Mehndi 250 heads">
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Mehndi package — 250" />
            </Field>
            <Field label="Headcount it is costed for" hint="Carried onto the quotation as a starting point">
              <Input type="number" min="0" value={persons} onChange={(e) => setPersons(e.target.value)} placeholder="250" />
            </Field>
            <Field label="Description" hint="A line to tell it apart from similar templates">
              <Input value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Standard mehndi menu with bar b q" />
            </Field>
          </div>
        </Card>
      ) : (
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer" hint="Search a saved customer, or just type a name below">
            <SearchSelect
              options={customerOptions}
              value={customerId ? Number(customerId) : null}
              onChange={(v) => {
                setCustomerId(v === null ? '' : String(v));
                const c = customers.find((x) => x.id === Number(v));
                if (c) { setCustomerName(c.name); setContactNo(c.phone); }
              }}
              placeholder="Search customers…"
              emptyLabel="One-off customer"
            />
          </Field>
          <Field label="Name"><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="AZEEM BHAI" /></Field>
          <Field label="Contact no."><Input value={contactNo} onChange={(e) => setContactNo(e.target.value)} placeholder="0300-1234567" /></Field>
          <Field label="Place of function"><Input value={placeOfFunction} onChange={(e) => setPlaceOfFunction(e.target.value)} placeholder="4L Chowrangi" /></Field>
          <Field label="Quotation date"><DateInput value={quotationDate} onChange={setQuotationDate} showDay={false} /></Field>
          <Field label="Event date"><DateInput value={deliveryDate} onChange={setDeliveryDate} showDay={false} /></Field>
          <Field label="Persons"><Input type="number" min="0" value={persons} onChange={(e) => setPersons(e.target.value)} placeholder="250" /></Field>
          <Field label="Status">
            <SearchSelect
              options={(Object.keys(CATERING_STATUS_META) as CateringStatus[]).map((s) => ({ value: s, label: CATERING_STATUS_META[s].label }))}
              value={status}
              onChange={(v) => v && setStatus(v as CateringStatus)}
              placeholder="Search…"
              emptyLabel="Select status…"
            />
          </Field>
          <Field label="Advance agreed" hint="What the customer promised, not what they have paid">
            <Input type="number" min="0" value={advance} onChange={(e) => setAdvance(e.target.value)} />
          </Field>
        </div>
      </Card>
      )}

      {sections.map((sec) => {
        const rows = lines.filter((l) => l.section === sec.key);
        return (
          <Card key={sec.key} className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display text-lg text-[rgb(var(--text))]">{sec.title}</div>
                <div className="text-xs text-[rgb(var(--text-dim))]">{sec.hint}</div>
              </div>
              <Button variant="ghost" onClick={() => setLines((ls) => [...ls, blank(sec.key)])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add line
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[rgb(var(--border))] px-4 py-6 text-center text-sm text-[rgb(var(--text-dim))]">
                No {sec.title.toLowerCase()} on this quotation.
              </div>
            ) : (
              /* A grid of rows rather than a table: the pickers drop a floating
                 panel, and a scrollable <table> wrapper clipped it off. */
              <div className="space-y-2">
                {rows.map((l) => (
                  <div key={l.key} className="rounded-xl border border-[rgb(var(--border)/0.5)] p-2">
                    {sec.key === 'CHARGE' ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px] flex-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Description</label>
                          <Input value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} placeholder="TRANSPORT" />
                        </div>
                        <div className="w-36">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Amount</label>
                          <Input type="number" min="0" value={l.amount} onChange={(e) => setLine(l.key, { amount: e.target.value })} className="text-right" />
                        </div>
                        <button onClick={() => removeLine(l.key)} title="Remove line"
                          className="mb-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[rgb(var(--text-dim))] hover:text-negative sm:min-h-0 sm:min-w-0 sm:p-2">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 items-start gap-2">
                        <div className="col-span-12 sm:col-span-7">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Dish</label>
                          {/* One box: type to search the menu, click a match to
                              price the line from it, or just keep typing past
                              the suggestions for a genuine one-off dish. */}
                          <DishCombobox
                            options={menuOptions}
                            menuItemId={l.menuItemId}
                            description={l.description}
                            onPick={(id) => pickMenu(l.key, id)}
                            onText={(text) => setLine(l.key, {
                              description: text,
                              // Diverging from the picked dish's name un-links
                              // the line — see the note on `setLine` for why
                              // rate and unit are deliberately left alone.
                              ...(l.menuItemId ? { menuItemId: null } : {}),
                            })}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Qty</label>
                          <Input type="number" min="0" step="0.01" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                        </div>
                        <div className="col-span-4 sm:col-span-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Unit</label>
                          <SearchSelect
                            options={unitOptionsFor(l)}
                            value={l.unit}
                            onChange={(v) => v && setLine(l.key, { unit: v as CateringUnit })}
                            placeholder="Unit…"
                            emptyLabel="Unit"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-1">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Rate</label>
                          <Input type="number" min="0" value={l.rate} onChange={(e) => setLine(l.key, { rate: e.target.value })} />
                        </div>
                        <div className="col-span-8 sm:col-span-1 text-right">
                          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[rgb(var(--text-dim))]">Amount</label>
                          <span className="tnum inline-block py-2 text-sm text-[rgb(var(--text))]">{fmtMoney(lineTotal(l), false)}</span>
                        </div>
                        {/* On a phone this was a 16px-wide column holding an
                            icon — impossible to hit with a thumb, and clipped
                            besides. It gets a quarter of the row and a labelled
                            44px target there, and stays the bare icon on a
                            desktop where the column is one twelfth wide. */}
                        <div className="col-span-4 sm:col-span-1">
                          <label aria-hidden className="mb-1 block text-[11px] uppercase tracking-wider opacity-0">·</label>
                          <div className="flex justify-end">
                            <button onClick={() => removeLine(l.key)} title="Remove line"
                              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-[rgb(var(--border)/0.6)] text-xs font-medium text-[rgb(var(--text-dim))] transition-colors hover:border-negative/40 hover:text-negative sm:min-h-0 sm:w-auto sm:border-0 sm:p-2">
                              <X className="h-4 w-4" />
                              <span className="sm:hidden">Remove</span>
                            </button>
                          </div>
                        </div>

                        {/* The line is out of step with the rate card. Shown,
                            never applied on its own — see `menuDrift`. */}
                        {(() => {
                          const drift = menuDrift(l);
                          if (!drift) return null;
                          const says = [
                            drift.unit ? `per ${UNIT_META[drift.unit].label}` : null,
                            drift.rate ? fmtMoney(Number(drift.rate), false) : null,
                          ].filter(Boolean).join(' at ');
                          return (
                            <div className="col-span-12 -mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                              <span className="text-[rgb(var(--text-dim))]">
                                Menu &amp; Rates now says <span className="text-gold">{says}</span> for this dish.
                              </span>
                              <button
                                type="button"
                                onClick={() => setLine(l.key, drift)}
                                className="rounded-lg border border-[rgb(var(--gold)/0.45)] px-2 py-0.5 font-medium text-gold transition-colors hover:bg-[rgb(var(--gold)/0.12)]"
                              >
                                Use it on this line
                              </button>
                            </div>
                          );
                        })()}
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
          <div className="flex justify-between"><span className="text-[rgb(var(--text-dim))]">Dishes</span><span className="tnum">{fmtMoney(totals.items)}</span></div>
          <div className="flex justify-between"><span className="text-[rgb(var(--text-dim))]">Charges</span><span className="tnum">{fmtMoney(totals.charges)}</span></div>
          <div className="flex justify-between border-t border-[rgb(var(--border)/0.5)] pt-1.5 font-medium"><span>Grand total</span><span className="tnum text-gold">{fmtMoney(totals.grand)}</span></div>
        </div>
        <Field label="Note" hint="Prints under the terms on the slip">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit} disabled={pending}>
            <Save className="mr-1.5 h-4 w-4" />
            {pending ? 'Saving…'
              : isTemplate ? (template ? 'Save template' : 'Create template')
                : quotation ? 'Save changes' : 'Create quotation'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
