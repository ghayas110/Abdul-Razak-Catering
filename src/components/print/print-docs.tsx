import { fmtMoney, fmtDate, fmtPhone } from '@/lib/format';
import { BRAND_DEFAULTS, type BrandInfo } from '@/lib/brand-info';

// ── Shared bits ────────────────────────────────────────
/** Light-ray divider used inside printed documents. */
function Flourish({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 240 24" width="150" height="15" className="rgb-flourish" style={{ display: 'block', margin: '0 auto', transform: flip ? 'rotate(180deg)' : undefined }} fill="none" aria-hidden>
      <path d="M120 5 l4.5 7 -4.5 7 -4.5 -7 z" fill="currentColor" />
      <rect x="60" y="11.2" width="48" height="1.6" rx="0.8" fill="currentColor" />
      <rect x="132" y="11.2" width="48" height="1.6" rx="0.8" fill="currentColor" />
      <path d="M108 12 l-14 -4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M108 12 l-14 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M132 12 l14 -4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M132 12 l14 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M60 12 h-22" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <path d="M180 12 h22" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

/**
 * The wordmark line. The house name prints whole, on one line. A tagline is
 * optional and normally blank; when one IS set and the name ends with it, it
 * is dropped from the big line because it already prints underneath.
 */
function wordmark(brand: BrandInfo): string {
  const name = (brand.name ?? '').trim();
  const tag = (brand.tagline ?? '').trim();
  if (tag && name.toLowerCase().endsWith(' ' + tag.toLowerCase())) {
    return name.slice(0, name.length - tag.length).trim();
  }
  return name;
}

/**
 * The dark bar behind the header and footer, drawn as an SVG rect rather than
 * a CSS background.
 *
 * Chrome's print dialog has a "Background graphics" checkbox that is OFF by
 * default on many setups. With it off, a CSS `background` is simply not
 * printed — which left the gold wordmark sitting on white paper, effectively
 * invisible, and is why the header and footer came out missing. An SVG rect is
 * a foreground graphic, so it prints either way.
 */
function BandFill() {
  return (
    <svg
      className="rgb-band-fill"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect x="0" y="0" width="100" height="100" fill="#0B0B0D" />
    </svg>
  );
}

/**
 * The letterhead band.
 *
 * A horizontal lockup: the monogram on the left, the business name beside it,
 * matching the mark used on screen. Deliberately typeset rather than a flat
 * image of the whole logo, for two reasons.
 *
 * The name is per-document: a slip carries whatever the trading profile in
 * Settings says at the time it is printed, so one baked-in image would go
 * stale the first time the client renames themselves. And typeset text stays
 * crisp at any size and prints cleanly even when a printer drops images.
 *
 * The band is dark, so the type is gold and the transparent monogram sits on
 * it without a halo.
 */
function LogoBand({ size = 'md', brand }: { size?: 'md' | 'lg'; brand: BrandInfo }) {
  /**
   * The wordmark is sized AGAINST the mark, not independently.
   *
   * It used to be 28px beside a 52px mark, which read as two separate things
   * stuck side by side: the type overpowered the crest, and because the text
   * box was only 29px tall against the mark's 52px, the two had different
   * heights and the word — descender and all — sat visibly lower than the
   * crest's centre. Roughly 0.42 of the mark keeps the cap height close to the
   * crest's inner monogram, which is what makes the pair read as one lockup.
   */
  const markPx = size === 'lg' ? 62 : 52;
  const word = `${Math.round(markPx * 0.42)}px`;
  const sub = size === 'lg' ? '13px' : '11px';
  const mark = `${markPx}px`;

  return (
    <div className="rgb-band">
      <BandFill />
      {/* Both halves of the lockup are given the mark's height (see
          .rgb-lockup-text in print.css), so they are centred by construction
          rather than by the renderer agreeing with us about flexbox — which
          html2canvas, the rasteriser behind the shared PDF, does not reliably
          do. */}
      <div className="rgb-lockup" style={{ ['--rgb-mark' as string]: mark }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mark.png"
          alt=""
          aria-hidden
          className="rgb-lockup-mark"
          style={{ height: mark, width: 'auto' }}
          loading="eager"
          decoding="sync"
        />
        <div className="rgb-lockup-text">
          <div className="rgb-logo-word rgb-logo-gold" style={{ fontSize: word, lineHeight: 1.05 }}>
            {wordmark(brand)}
          </div>
          {brand.tagline && (
            <div className="rgb-lockup-sub" style={{ fontSize: sub }}>{brand.tagline}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The footer band on every printed document: the dark bookend to the header.
 *
 * It carries no text. The address and phone numbers used to print here; they
 * now sit beneath the letterhead (see ContactBlock), and printing them again
 * at the foot of a one-page slip would say the same thing twice.
 */
function FooterBand(_: { brand: BrandInfo }) {
  return (
    <div className="rgb-band-footer">
      <BandFill />
    </div>
  );
}

/**
 * The house name, shop address and phone numbers, set beneath the letterhead
 * on the left of the title row — the right side carries the document title.
 *
 * Everything comes from Catering -> Settings. Phone numbers are stored as one
 * comma-separated field and each prints on its own line. With nothing set the
 * block renders nothing, and the title row's `:only-child` rule pushes the
 * title back to the right.
 */
function ContactBlock({ name, address, phone }: { name: string; address?: string; phone?: string }) {
  const phones = (phone ?? '').split(/[,/\n]/).map((n) => n.trim()).filter(Boolean);
  if (!name && !address && phones.length === 0) return null;
  return (
    <div className="rgb-contact">
      {name && <div className="rgb-contact-name">{name}</div>}
      {address && <div>{address}</div>}
      {phones.map((n) => <div key={n}>{n}</div>)}
    </div>
  );
}

/**
 * The slip prints the shift NAME only — "DINNER", "LUNCH".
 *
 * The standard service windows used to be appended in brackets, but the times
 * are negotiated per booking and a fixed window printed on a signed slip is a
 * promise the venue has not actually made.
 */
function isRtl(s: string): boolean {
  return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s);
}

/**
 * Terms printed ON the invoice itself, in two columns, so the slip is a single
 * page. Replaces the separate overleaf sheet.
 *
 * Each line is direction-detected independently: the client's rules may be in
 * Urdu, which must render right-to-left in a Nastaliq face, but an English
 * rule mixed into the same list still has to read left-to-right.
 */
function InlineTerms({ rules, notes }: { rules?: string[]; notes?: string | null }) {
  // Every term on every slip comes from the database — the booking's own rules,
  // the portal library, or the catering rules. Nothing is compiled in, so with
  // nothing to print the whole block (heading included) is omitted rather than
  // falling back to wording nobody can edit.
  const list = rules ?? [];
  if (list.length === 0 && !notes) return null;
  // A long list would otherwise grow the sheet past A4 and spill onto a second
  // page, which is the whole thing this layout exists to avoid. Tighten the
  // columns instead — measured: 7 rules fit comfortably, 16 need three columns.
  const density = list.length > 12 ? ' rgb-inline-terms--x' : list.length > 8 ? ' rgb-inline-terms--dense' : '';
  return (
    <div className={`rgb-inline-terms${density}`}>
      {list.length > 0 && (
        <>
          <div className="rgb-inline-terms-head">
            The undersigned hereby agree to: <span className="rgb-urdu">شرائط و ضوابط</span>
          </div>
          <ul className="rgb-inline-terms-list">
            {list.map((t, i) => (
              <li key={i} className={isRtl(t) ? 'rgb-urdu' : undefined} dir={isRtl(t) ? 'rtl' : 'ltr'}>{t}</li>
            ))}
          </ul>
        </>
      )}
      {notes && (
        <div className={`rgb-inline-notes ${isRtl(notes) ? 'rgb-urdu' : ''}`} dir={isRtl(notes) ? 'rtl' : 'ltr'}>
          <strong>Notes:</strong> {notes}
        </div>
      )}
    </div>
  );
}
/**
 * The booking invoice — ONE page. Terms are printed on the invoice itself
 * rather than overleaf, so the whole slip is a single sheet to hand over,
 * print, or send as a one-page PDF.
 */
// ── Catering monthly report ────────────────────────────

export interface CateringReportDocData {
  label: string;
  generated: string;
  rows: {
    sNo: number; date: string; customer: string; docNo: string; invoiced: boolean;
    items: number; total: number; vendor: number; received: number;
    profit: number; paymentType: string;
  }[];
  totals: { items: number; total: number; vendor: number; received: number; profit: number };
  byMethod: { method: string; amount: number }[];
}

/**
 * The catering month, on the house paper.
 *
 * One row per event: what was billed, what the vendors cost, what came in and
 * what was left. Landscape, because ten columns will not sit on a portrait A4
 * without shrinking the type past reading size.
 */
export function CateringReportDoc({ r, p, brand, receivableTotal = 0, expenseTotal = 0 }: {
  r: CateringReportDocData;
  p: CateringDocProfile;
  brand: BrandInfo;
  /** Money received/paid outside the quotation system for this same period — see catering.ts. */
  receivableTotal?: number;
  expenseTotal?: number;
}) {
  const cateringName = p.name || brand.name;
  const cateringBrand: BrandInfo = {
    ...brand,
    name: cateringName,
    // No second line under the wordmark: the house name is set whole, on one line.
    tagline: '',
    address: p.address || brand.address,
    footerPhone: p.phone || brand.footerPhone,
  };

  const money = (n: number) => fmtMoney(n, false);

  return (
    <div className="rgb-landwrap"><div className="rgb-sheet rgb-sheet-land rgb-report-sheet">
      <LogoBand brand={cateringBrand} />
      <div className="rgb-body">
        <div className="rgb-meta">
          <ContactBlock name={cateringName} address={cateringBrand.address} phone={cateringBrand.footerPhone} />
          <div style={{ textAlign: 'right' }}>
            <div className="rgb-doc-title">Catering Report</div>
            <div className="rgb-slipno">{r.label}</div>
            <div style={{ fontSize: '11px', color: '#6b6455', marginTop: '2px', fontWeight: 600 }}>
              Generated: {fmtDate(r.generated)}
            </div>
          </div>
        </div>

        <div className="rgb-sec" style={{ marginTop: 0 }}>Events</div>
        <table className="rgb-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>#</th>
              <th style={{ width: '9%' }}>Date</th>
              <th>Customer</th>
              <th style={{ width: '10%' }}>Document</th>
              <th className="r" style={{ width: '12%' }}>Items</th>
              <th className="r" style={{ width: '12%' }}>Total</th>
              <th className="r" style={{ width: '10%' }}>Vendor</th>
              <th className="r" style={{ width: '10%' }}>Received</th>
              <th className="r" style={{ width: '10%' }}>Profit</th>
              <th style={{ width: '10%' }}>Payment</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((e) => (
              <tr key={e.docNo}>
                <td>{e.sNo}</td>
                <td>{fmtDate(e.date)}</td>
                <td>{e.customer || '—'}</td>
                <td>
                  {e.docNo}
                  {!e.invoiced && <span style={{ color: '#a49c88' }}> (quote)</span>}
                </td>
                <td className="r">{money(e.items)}</td>
                <td className="r">{money(e.total)}</td>
                <td className="r">{money(e.vendor)}</td>
                <td className="r">{money(e.received)}</td>
                <td className="r" style={{ color: e.profit >= 0 ? '#2E7D32' : '#C62828' }}>{money(e.profit)}</td>
                <td>{e.paymentType || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>TOTAL</td>
              <td className="r">{money(r.totals.items)}</td>
              <td className="r">{money(r.totals.total)}</td>
              <td className="r">{money(r.totals.vendor)}</td>
              <td className="r">{money(r.totals.received)}</td>
              <td className="r">{money(r.totals.profit)}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
          <div style={{ width: '46%' }}>
            <div className="rgb-sec" style={{ marginTop: 0 }}>Receipts by Method</div>
            <table className="rgb-table">
              <thead><tr><th>Method</th><th className="r" style={{ width: '40%' }}>Amount</th></tr></thead>
              <tbody>
                {r.byMethod.length === 0
                  ? <tr><td colSpan={2} style={{ color: '#a49c88' }}>No receipts in this period</td></tr>
                  : r.byMethod.map((m) => (
                    <tr key={m.method}><td>{m.method}</td><td className="r">{money(m.amount)}</td></tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ width: '40%' }}>
            <div className="rgb-sec" style={{ marginTop: 0 }}>Summary</div>
            <table className="rgb-sum"><tbody>
              <tr><td className="lbl">Events</td><td className="val">{r.rows.length}</td></tr>
              <tr><td className="lbl">Revenue</td><td className="val">{money(r.totals.total)}</td></tr>
              <tr><td className="lbl">Vendor Cost</td><td className="val">{money(r.totals.vendor)}</td></tr>
              {receivableTotal > 0 && (
                <tr><td className="lbl">Amount Receivable</td><td className="val" style={{ color: '#2E7D32' }}>+{money(receivableTotal)}</td></tr>
              )}
              {expenseTotal > 0 && (
                <tr><td className="lbl">Other Payables</td><td className="val" style={{ color: '#C62828' }}>-{money(expenseTotal)}</td></tr>
              )}
              <tr className="total"><td>Profit Earned</td><td className="val">{money(r.totals.profit + receivableTotal - expenseTotal)}</td></tr>
              <tr><td className="lbl">Received</td><td className="val" style={{ color: '#2E7D32' }}>{money(r.totals.received)}</td></tr>
              <tr className="grand">
                <td>Balance Due</td>
                <td className="val" style={{ color: r.totals.total - r.totals.received > 0 ? '#C62828' : '#2E7D32' }}>
                  {money(Math.max(0, r.totals.total - r.totals.received))}
                </td>
              </tr>
            </tbody></table>
          </div>
        </div>

        <div className="rgb-signs" style={{ marginTop: 'auto', paddingTop: '12px' }}>
          <div className="rgb-sign-line">Prepared By</div>
          <div className="rgb-stamp">STAMP</div>
          <div className="rgb-sign-line">Authorised Signature</div>
        </div>
      </div>
      <FooterBand brand={cateringBrand} />
    </div></div>
  );
}

// ── Catering quotation ─────────────────────────────────
export interface CateringDocData {
  quotaNo: string;
  customerName: string;
  contactNo: string;
  placeOfFunction: string;
  quotationDate: string;
  deliveryDate: string | null;
  persons: number;
  itemsTotal: number;
  grandTotal: number;
  paidAmount: number;
  status: string;
  note: string | null;
  /** Quotation or invoice. Changes the title, the labels and the number's name. */
  docType?: 'QUOTATION' | 'INVOICE';
  lines: {
    section: 'DISH' | 'CHARGE';
    description: string;
    qty: number;
    unit: string;
    rate: number;
    amount: number;
  }[];
}

export interface CateringDocProfile {
  name: string; person: string; phone: string; address: string;
  /** Printed in the header beside the status. Blank hides the line entirely. */
  taxNote?: string;
}

/**
 * The catering quotation slip.
 *
 * Carries every field the client's existing paper form does: quota number,
 * place of function, event date, headcount, the dish grid with its quantity
 * and rate columns, the transport and service charges, and the terms.
 *
 * One table, one total. Dishes are quoted all-in, so nothing is broken out
 * underneath them and the customer reads a single price per item.
 */
export function CateringQuotationDoc({ d, p, rules = [], brand }: {
  d: CateringDocData; p: CateringDocProfile; rules?: string[]; brand: BrandInfo;
}) {
  const dishes = d.lines.filter((l) => l.section === 'DISH');
  const charges = d.lines.filter((l) => l.section === 'CHARGE');
  const balance = d.grandTotal - d.paidAmount;

  const badge = d.status === 'CANCELLED'
    ? { c: 'rgb-badge-cancelled', t: 'Cancelled' }
    : d.status === 'QUOTATION'
      ? { c: 'rgb-badge-enquiry', t: 'Quotation' }
      : balance <= 0.01
        ? { c: 'rgb-badge-paid', t: 'Fully Paid' }
        : d.paidAmount > 0
          ? { c: 'rgb-badge-partial', t: 'Partially Paid' }
          : { c: 'rgb-badge-due', t: 'Outstanding' };

  // The catering arm trades under its own name and shop address, so the bands
  // carry the trading identity from Catering -> Settings.
  // `wordmark()` drops the tagline from the big line when the name ends with
  // it, so these two must agree or the letterhead prints the name twice over.
  const cateringName = p.name || brand.name;
  const cateringBrand: BrandInfo = {
    ...brand,
    name: cateringName,
    // No second line under the wordmark: the house name is set whole, on one line.
    tagline: '',
    address: p.address || brand.address,
    footerPhone: p.phone || brand.footerPhone,
  };

  /**
   * A long quotation outgrows the shared one-page tuning: past roughly a dozen
   * lines the sheet grows beyond the printable strip and throws the footer band
   * onto a second page.
   *
   * Tighten by line count rather than letting it spill. Thresholds were set by
   * measuring the rendered sheet in a browser against the real quotations —
   * see the matching block in print.css for the numbers.
   */
  // An invoice is billed after the event; a quotation is the estimate before
  // it. Same layout, different wording, so a customer holding both can tell
  // instantly which one they are looking at.
  const isInvoice = d.docType === 'INVOICE';

  const rowCount = dishes.length + charges.length;
  const density = rowCount > 13 ? ' rgb-cater--xx'
    : rowCount > 10 ? ' rgb-cater--x'
      : rowCount > 6 ? ' rgb-cater--dense' : '';

  return (
    <div className={`rgb-sheet rgb-onepage rgb-cater${density}`}>
      <LogoBand brand={cateringBrand} />
      <div className="rgb-body">
        <div className="rgb-meta">
          <ContactBlock name={cateringName} address={cateringBrand.address} phone={cateringBrand.footerPhone} />
          <div style={{ textAlign: 'right' }}>
            <div className="rgb-doc-title">{isInvoice ? 'Catering Invoice' : 'Catering Quotation'}</div>
            <div className="rgb-slipno">{isInvoice ? 'Invoice' : 'Quota'} # {d.quotaNo}</div>
            <div style={{ fontSize: '11px', color: '#6b6455', marginTop: '2px', fontWeight: 600 }}>
              {isInvoice ? 'Invoice' : 'Quotation'} Date: {fmtDate(d.quotationDate)}
            </div>
            {/* Money terms read top-down: the tax condition sits directly
                above the status, so it is met before the balance. */}
            {p.taxNote && <div className="rgb-taxnote">{p.taxNote}</div>}
            <div style={{ marginTop: '4px' }}><span className={`rgb-badge ${badge.c}`}>{badge.t}</span></div>
          </div>
        </div>

        <table className="rgb-kv">
          <tbody>
            <tr>
              <td className="k">Name</td><td>{d.customerName || '—'}</td>
              <td className="k">Quotation Date</td><td>{fmtDate(d.quotationDate)}</td>
            </tr>
            <tr>
              <td className="k">Contact No.</td><td>{fmtPhone(d.contactNo)}</td>
              <td className="k">Event Date</td><td>{d.deliveryDate ? fmtDate(d.deliveryDate) : '—'}</td>
            </tr>
            <tr>
              <td className="k">Place of Function</td><td>{d.placeOfFunction || '—'}</td>
              <td className="k">Persons</td><td>{d.persons || '—'}</td>
            </tr>
          </tbody>
        </table>

        <div className="rgb-sec">Required Items (Making Price)</div>
        <table className="rgb-table">
          <thead>
            <tr>
              <th className="c" style={{ width: '6%' }}>S.No</th>
              <th style={{ width: '46%' }}>Description</th>
              <th className="r" style={{ width: '15%' }}>Quantity</th>
              <th className="r" style={{ width: '15%' }}>Rate</th>
              <th className="r" style={{ width: '18%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {dishes.map((l, i) => (
              <tr key={`d${i}`}>
                <td className="c">{i + 1}</td>
                <td>{l.description}</td>
                <td className="r">{l.qty ? `${fmtMoney(l.qty, false)} ${l.unit}` : '—'}</td>
                <td className="r">{l.rate ? fmtMoney(l.rate, false) : '—'}</td>
                <td className="r">{fmtMoney(l.amount, false)}</td>
              </tr>
            ))}
            {/* Transport / service — an amount with no qty or rate. */}
            {charges.map((l, i) => (
              <tr key={`c${i}`}>
                <td className="c" />
                <td>{l.description}</td>
                <td colSpan={2} style={{ color: '#a49c88' }}>Charge</td>
                <td className="r">{fmtMoney(l.amount, false)}</td>
              </tr>
            ))}
            <tr className="rgb-row-total">
              <td colSpan={4} className="r">Items Total</td>
              <td className="r">{fmtMoney(d.itemsTotal, false)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
          <div style={{ flex: 1 }} />
          <div style={{ width: '46%' }}>
            <div className="rgb-sec" style={{ marginTop: 0 }}>Account Summary</div>
            <table className="rgb-sum"><tbody>
              <tr><td className="lbl">Items Total</td><td className="val">{fmtMoney(d.itemsTotal, false)}</td></tr>
              <tr className="total"><td>Grand Total</td><td className="val">{fmtMoney(d.grandTotal, false)}</td></tr>
              <tr><td className="lbl">Advance Received</td><td className="val" style={{ color: '#2E7D32' }}>{fmtMoney(d.paidAmount, false)}</td></tr>
              <tr className="grand"><td>Balance</td><td className="val" style={{ color: balance > 0 ? '#C62828' : '#2E7D32' }}>{fmtMoney(balance, false)}</td></tr>
            </tbody></table>
          </div>
        </div>

        {d.status !== 'CANCELLED' && (
          <div className={`rgb-banner ${balance > 0 ? 'rgb-banner-due' : 'rgb-banner-paid'}`}>
            {balance > 0 ? `BALANCE:  ${fmtMoney(balance)}` : '✓  FULLY PAID — THANK YOU'}
          </div>
        )}

        {/* Conditions come from Catering → Rules, and only when Settings says
            to print them at all — `rules` arrives empty otherwise. There is no
            second, hardcoded source: the slip used to splice in a payment-terms
            line and a standing note from the profile as well, which meant the
            same paragraph lived in three places and drifted.

            The note typed on THIS document is separate. It is the operator's
            own line about this one job, not boilerplate, so it prints whether
            or not conditions do. */}
        <InlineTerms rules={rules} notes={d.note} />

        <div className="rgb-signs" style={{ marginTop: 'auto', paddingTop: '12px' }}>
          <div className="rgb-sign-line">{p.person || 'Customer Signature'}</div>
          <div className="rgb-stamp">STAMP</div>
          <div className="rgb-sign-line">Authorised Signature</div>
        </div>
      </div>
      <FooterBand brand={cateringBrand} />
    </div>
  );
}

// ── Catering custom bill ────────────────────────────────
export interface CateringCustomBillDocData {
  billNo: string;
  billTo: string;
  contactNo: string;
  address: string;
  billDate: string;
  grandTotal: number;
  note: string;
  items: { section: 'DISH' | 'CHARGE'; description: string; qty: number; unit: string; rate: number; amount: number }[];
}

/**
 * A bill with no menu behind it — Bill To, a date, and whatever charges
 * belong on it. Same letterhead and one-page shell as the quotation slip, cut
 * down to just the fields a custom bill actually carries: nothing from the
 * menu, and no advance/balance tracking, because this document isn't tied to
 * the invoice-with-installments system at all.
 */
export function CustomBillDoc({ d, p, rules = [], brand }: {
  d: CateringCustomBillDocData; p: CateringDocProfile;
  /** Active rules from Catering → Rules, or empty when Settings hides them. */
  rules?: string[];
  brand: BrandInfo;
}) {
  const cateringName = p.name || brand.name;
  const cateringBrand: BrandInfo = {
    ...brand,
    name: cateringName,
    // No second line under the wordmark: the house name is set whole, on one line.
    tagline: '',
    address: p.address || brand.address,
    footerPhone: p.phone || brand.footerPhone,
  };

  const lines = d.items.filter((it) => it.section !== 'CHARGE');
  const charges = d.items.filter((it) => it.section === 'CHARGE');
  const rowCount = d.items.length;
  const density = rowCount > 13 ? ' rgb-cater--xx' : rowCount > 10 ? ' rgb-cater--x' : rowCount > 6 ? ' rgb-cater--dense' : '';

  return (
    <div className={`rgb-sheet rgb-onepage rgb-cater${density}`}>
      <LogoBand brand={cateringBrand} />
      <div className="rgb-body">
        <div className="rgb-meta">
          <ContactBlock name={cateringName} address={cateringBrand.address} phone={cateringBrand.footerPhone} />
          <div style={{ textAlign: 'right' }}>
            <div className="rgb-doc-title">Bill</div>
            <div className="rgb-slipno">Bill # {d.billNo}</div>
            <div style={{ fontSize: '11px', color: '#6b6455', marginTop: '2px', fontWeight: 600 }}>
              Date: {fmtDate(d.billDate)}
            </div>
          </div>
        </div>

        <table className="rgb-kv">
          <tbody>
            <tr>
              <td className="k">Bill To</td><td>{d.billTo || '—'}</td>
              <td className="k">Date</td><td>{fmtDate(d.billDate)}</td>
            </tr>
            <tr>
              <td className="k">Contact No.</td><td>{d.contactNo ? fmtPhone(d.contactNo) : '—'}</td>
              <td className="k">Address</td><td>{d.address || '—'}</td>
            </tr>
          </tbody>
        </table>

        <div className="rgb-sec">Items</div>
        <table className="rgb-table">
          <thead>
            <tr>
              <th className="c" style={{ width: '6%' }}>S.No</th>
              <th style={{ width: '46%' }}>Description</th>
              <th className="r" style={{ width: '15%' }}>Quantity</th>
              <th className="r" style={{ width: '15%' }}>Rate</th>
              <th className="r" style={{ width: '18%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((it, i) => (
              <tr key={`l${i}`}>
                <td className="c">{i + 1}</td>
                <td>{it.description}</td>
                <td className="r">{it.qty ? `${fmtMoney(it.qty, false)} ${it.unit}` : '—'}</td>
                <td className="r">{it.rate ? fmtMoney(it.rate, false) : '—'}</td>
                <td className="r">{fmtMoney(it.amount, false)}</td>
              </tr>
            ))}
            {/* Transport / service — an amount with no quantity or rate, set
                out exactly as the quotation slip sets out its charges. */}
            {charges.map((it, i) => (
              <tr key={`c${i}`}>
                <td className="c" />
                <td>{it.description}</td>
                <td colSpan={2} style={{ color: '#a49c88' }}>Charge</td>
                <td className="r">{fmtMoney(it.amount, false)}</td>
              </tr>
            ))}
            <tr className="rgb-row-total">
              <td colSpan={4} className="r">Grand Total</td>
              <td className="r">{fmtMoney(d.grandTotal, false)}</td>
            </tr>
          </tbody>
        </table>

        <InlineTerms rules={rules} notes={d.note || null} />

        <div className="rgb-signs" style={{ marginTop: 'auto', paddingTop: '12px' }}>
          <div className="rgb-sign-line">{p.person || 'Signature'}</div>
          <div className="rgb-stamp">STAMP</div>
          <div className="rgb-sign-line">Authorised Signature</div>
        </div>
      </div>
      <FooterBand brand={cateringBrand} />
    </div>
  );
}
