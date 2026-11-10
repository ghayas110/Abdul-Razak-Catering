// ── Roles & permissions ────────────────────────────────
/**
 * Ordered most- to least-privileged. Drives sort order and the role picker.
 *
 * Five, not fifteen. This is one business with one portal, so a role is a
 * shorthand for a permission set and nothing else — there is no hierarchy for
 * it to sit in. Anyone who needs a set that is not on this list gets the role
 * closest to it plus an explicit override, which is what `users.permissions`
 * is for.
 */
export type Role =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'VIEWER';

export const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'VIEWER'];

export const ROLE_META: Record<Role, { label: string; hint: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', hint: 'Everything, including user accounts and the danger zone' },
  OWNER:       { label: 'Owner',       hint: 'Everything except managing other people\'s accounts' },
  MANAGER:     { label: 'Manager',     hint: 'Quotations, invoices, menu, customers and enquiries' },
  ACCOUNTANT:  { label: 'Accountant',  hint: 'The books: ledger, vendor bills and reports' },
  VIEWER:      { label: 'Viewer',      hint: 'Read only' },
};

/**
 * Granular capabilities. A role maps to a default set, but any user can be
 * granted or revoked individual permissions — the client has always wanted to
 * hand one person one extra screen without inventing a role for them.
 */
export type Permission =
  | 'catering.view'
  | 'catering.manage'
  | 'catering.reports'
  | 'leads.view'
  | 'users.manage'
  | 'settings.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'catering.view', 'catering.manage', 'catering.reports',
  'leads.view', 'users.manage', 'settings.manage',
];

export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  /**
   * Everything except `users.manage`. Creating logins and handing out
   * permissions is the one thing kept behind the Super Admin, so that an
   * Owner account being left signed in on a shared machine cannot be used to
   * mint a second Owner.
   */
  OWNER: ALL_PERMISSIONS.filter((p) => p !== 'users.manage'),
  /** Runs the quotations day to day. Deliberately no financial visibility. */
  MANAGER: ['catering.view', 'catering.manage', 'leads.view'],
  /** The books, and nothing that changes what was quoted. */
  ACCOUNTANT: ['catering.view', 'catering.reports'],
  VIEWER: ['catering.view'],
};

/**
 * A quotation is an estimate given before the booking. An invoice is what is
 * billed after the event. They are separate records with separate line items:
 * an invoice is copied from a quotation and then diverges as final quantities
 * settle, and editing one must never reach back into the other.
 */
export type CateringDocType = 'QUOTATION' | 'INVOICE';

export const CATERING_DOC_META: Record<CateringDocType, { label: string; noun: string }> = {
  QUOTATION: { label: 'Quotation', noun: 'quotation' },
  INVOICE: { label: 'Invoice', noun: 'invoice' },
};

/** Someone catering buys from: butcher, decorator, crockery hire, transport. */
export interface CateringVendorRow {
  id: number;
  name: string;
  category: string;
  phone: string;
  note: string;
  isActive: 0 | 1;
  /** Bills recorded against this vendor. Blocks a careless delete. */
  billCount?: number;
}

/** One vendor bill against one event. */
export interface CateringPayableRow {
  id: number;
  eventId: number;
  vendorId: number | null;
  vendorName: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  note: string;
}

/**
 * A saved set of quotation lines.
 *
 * Not a document: no customer, no dates, no money. Applying one copies its
 * lines onto a new quotation, which then goes its own way.
 */
export interface CateringTemplateRow {
  id: number;
  name: string;
  description: string;
  persons: number;
  note: string;
  isActive: 0 | 1;
  createdByName?: string | null;
  /** Filled by the detail read; the list leaves it undefined. */
  lines?: CateringLineRow[];
  /** Summary for the list, so it can show size without loading every line. */
  lineCount?: number;
  value?: number;
}

/**
 * A vendor bill with the event it belongs to attached.
 *
 * The plain `CateringPayableRow` is enough inside one event's ledger, where
 * the event is already the context. These listings cross events, so each row
 * has to carry its own.
 */
export interface CateringBillRow {
  id: number;
  eventId: number;
  quotaNo: string;
  customerName: string;
  eventDate: string | null;
  vendorId: number | null;
  vendorName: string;
  description: string;
  amount: number;
  paidAmount: number;
  /** amount - paidAmount, never below zero. */
  outstanding: number;
  settled: boolean;
  dueDate: string | null;
  note: string;
}

/** Filter for the bill listings. */
export type BillFilter = 'ALL' | 'UNPAID' | 'PAID';

/**
 * What one event earned, once its vendors are paid.
 *
 * `revenue` is the invoice when one has been raised, and the quotation's
 * figure before that, so an event in progress still shows a working profit
 * rather than nothing at all.
 */
export interface CateringEventLedger {
  eventId: number;
  quotaNo: string;
  invoiceNo: string | null;
  customerName: string;
  eventDate: string | null;
  status: CateringStatus;
  /** True once an invoice exists, so the figure is final rather than an estimate. */
  invoiced: boolean;
  revenue: number;
  received: number;
  payableTotal: number;
  payablePaid: number;
  profit: number;
}

export interface CateringRuleRow {
  id: number;
  text: string;
  sortOrder: number;
  isActive: 0 | 1;
}

// ── DB row shapes ──────────────────────────────────────
export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  permissions: string | null; // JSON array override, null = use role defaults
  /** Staff record this login belongs to; null = login only, not on the payroll. */
  employee_id: number | null;
  is_active: 0 | 1;
  created_at: string;
}

// ── Catering ───────────────────────────────────────────
/**
 * Which band of the quotation slip a line belongs to.
 *
 * Two bands only. An earlier version of this system carried a third, MEAT,
 * which itemised the raw meat supplied for each dish underneath it. This house
 * quotes a dish at one all-in rate, so that band is gone: see the note in
 * `quotation-editor.tsx` for why removing it also removed a whole class of
 * form-state bug.
 */
export type CateringSection = 'DISH' | 'CHARGE';
/**
 * Every unit a line can be counted in, in the order the pickers list them.
 *
 * THE single source. The type below is derived from it, `UNIT_META` must cover
 * it, the server actions validate against it, and the database ENUMs list the
 * same values — so adding a unit is this line plus one migration, and the four
 * of them cannot drift apart.
 */
export const CATERING_UNITS = ['KG', 'GRAM', 'LITRE', 'ML', 'CUP', 'PCS', 'NOS', 'PLATE'] as const;
export type CateringUnit = (typeof CATERING_UNITS)[number];

/**
 * What a unit measures, and how many BASE units one of it is worth.
 *
 * A rate is always quoted per base unit — per KG, per LITRE, per piece. A line
 * may be entered in a smaller unit, so 500 GRAM of a dish rated at 800/KG bills
 * as 500 × 0.001 × 800 = 400. Keeping the factor here rather than in the
 * database means the arithmetic is in one place and unit-testable.
 */
export const UNIT_META: Record<CateringUnit, { label: string; measure: 'WEIGHT' | 'VOLUME' | 'COUNT'; base: CateringUnit; factor: number }> = {
  KG:    { label: 'kg',     measure: 'WEIGHT', base: 'KG',    factor: 1 },
  GRAM:  { label: 'g',      measure: 'WEIGHT', base: 'KG',    factor: 0.001 },
  LITRE: { label: 'litre',  measure: 'VOLUME', base: 'LITRE', factor: 1 },
  ML:    { label: 'ml',     measure: 'VOLUME', base: 'LITRE', factor: 0.001 },
  /**
   * A cup is a SERVING here, not a quarter-litre.
   *
   * It would be tidy to call it volume and give it a 0.25 factor against the
   * litre, and it would also quietly quarter the money: a line reading
   * "20 cup @ 80" would bill 400 instead of 1,600, because the arithmetic
   * assumes a rate quoted per base unit. This house sells a cup of raita at a
   * price per cup, so the cup is its own base and what is typed is what is
   * billed. Same reasoning as the plate below.
   */
  CUP:   { label: 'cup',    measure: 'COUNT',  base: 'CUP',   factor: 1 },
  PCS:   { label: 'pcs',    measure: 'COUNT',  base: 'PCS',   factor: 1 },
  /** "Nos" — the count the client writes on a paper bill. Distinct from pcs. */
  NOS:   { label: 'nos',    measure: 'COUNT',  base: 'NOS',   factor: 1 },
  // Much of the menu is sold by the head rather than by weight. A plate is a
  // count like a piece, so it needs its own base: a dish priced per plate must
  // not offer "pcs" as an interchangeable unit, because they are not the same
  // thing to a customer reading the slip.
  PLATE: { label: 'plate',  measure: 'COUNT',  base: 'PLATE', factor: 1 },
};

/** The units a dish priced in `base` may be ordered in. */
export function unitsFor(base: CateringUnit): CateringUnit[] {
  const meta = UNIT_META[base];
  // Counts do not convert into one another: 3 plates is not 3 pieces. Weight
  // and volume still offer their whole family, so 500 g of a per-kg dish works.
  if (meta.measure === 'COUNT') return [base];
  return (Object.keys(UNIT_META) as CateringUnit[]).filter((u) => UNIT_META[u].measure === meta.measure);
}

/** Quantity expressed in the base unit the rate is quoted in. */
export function toBaseQty(qty: number, unit: CateringUnit): number {
  return (Number(qty) || 0) * UNIT_META[unit].factor;
}

/**
 * What a line is worth. The single definition of catering line arithmetic —
 * the editor, the server action and the slip all call this, so a rounding
 * change can never leave the printed slip disagreeing with the stored total.
 */
export function cateringLineAmount(qty: number, unit: CateringUnit, rate: number): number {
  return Math.round(toBaseQty(qty, unit) * (Number(rate) || 0) * 100) / 100;
}
export type CateringStatus = 'QUOTATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export const CATERING_STATUS_META: Record<CateringStatus, { label: string; tone: 'gold' | 'green' | 'amber' | 'muted' | 'red' }> = {
  QUOTATION: { label: 'Quotation', tone: 'amber' },
  CONFIRMED: { label: 'Confirmed', tone: 'gold' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};

/** Statuses that count as real business. A quotation is not yet money. */
export const CATERING_BILLABLE: CateringStatus[] = ['CONFIRMED', 'COMPLETED'];

export interface CateringCustomerRow {
  id: number;
  name: string;
  phone: string;
  phone2: string;
  address: string;
  note: string;
  /** How many quotations this customer has — blocks a careless delete. */
  quotationCount?: number;
}

/**
 * A dish on the rate card: one name, one unit, one rate.
 *
 * Dishes used to carry a priced variant per CATEGORY (QORMA under BEEF, under
 * CHICKEN), and a quotation line had to pick the category before it had a
 * price. This house quotes one rate per dish, so categories are gone entirely
 * — from the menu, from quotations, from invoices and from the printed slip.
 */
export interface CateringMenuItemRow {
  id: number;
  name: string;
  /** The unit the rate is quoted in — KG, LITRE or PCS. */
  unit: CateringUnit;
  rate: number;
  sortOrder: number;
  isActive: 0 | 1;
  usedCount?: number;
}

export interface CateringLineRow {
  id: number;
  quotationId: number;
  section: CateringSection;
  menuItemId: number | null;
  description: string;
  qty: number;
  unit: CateringUnit;
  rate: number;
  amount: number;
  sortOrder: number;
}

export interface CateringQuotationRow {
  id: number;
  quotaNo: string;
  /** Quotation or invoice. Separate records; see CATERING_DOC_META. */
  docType: CateringDocType;
  /** For an invoice, the quotation it was copied from. Null on a quotation. */
  sourceQuotationId: number | null;
  customerId: number | null;
  customerName: string;
  contactNo: string;
  placeOfFunction: string;
  quotationDate: string;
  /**
   * Shown as "Event date" everywhere. The column stays `delivery_date`: it is
   * referenced across queries, the WhatsApp message and the printed slip, and
   * renaming a column to change a label is churn with a migration attached.
   */
  deliveryDate: string | null;
  persons: number;
  /**
   * Every line on the document. Kept alongside `grandTotal`, which it always
   * equals, because both are stored columns and the slip prints a subtotal row
   * above the grand total.
   */
  itemsTotal: number;
  grandTotal: number;
  advanceAmount: number;
  paidAmount: number;
  status: CateringStatus;
  note: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  /** grandTotal - paidAmount. */
  balance: number;
  lines?: CateringLineRow[];
}

export interface CateringPaymentRow {
  id: number;
  quotationId: number;
  amount: number;
  paymentDate: string;
  method: string;
  receivedBy: number | null;
  receivedByName: string | null;
  note: string | null;
}

/**
 * PENDING: nothing paid yet. PARTIAL: some of it has come in. RECEIVED: paid
 * in full. Derived from `paidAmount` vs `amount`, never set directly — see
 * `recordCateringReceivablePayment`.
 */
export type CateringReceivableStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';

export const CATERING_RECEIVABLE_STATUS_META: Record<CateringReceivableStatus, { label: string; tone: 'green' | 'amber' | 'gold' }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  PARTIAL: { label: 'Partial', tone: 'gold' },
  RECEIVED: { label: 'Received', tone: 'green' },
};

/**
 * A debt owed to the business that is not a quotation — a personal loan, a
 * gift promised in installments. `amount` is the TOTAL owed; `paidAmount` is
 * the running total of everything paid against it so far, kept in step with
 * `CateringReceivablePaymentRow` below exactly the way a quotation's
 * `paidAmount` is kept in step with its payments. `payerName` is free text:
 * most of these people are never going to be a saved customer.
 */
export interface CateringReceivableRow {
  id: number;
  payerName: string;
  amount: number;
  paidAmount: number;
  /** amount - paidAmount, never below zero. */
  balance: number;
  receivedDate: string;
  status: CateringReceivableStatus;
  note: string;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
}

/** One installment against a CateringReceivableRow. Mirrors CateringPaymentRow. */
export interface CateringReceivablePaymentRow {
  id: number;
  receivableId: number;
  amount: number;
  paymentDate: string;
  method: string;
  note: string | null;
  receivedBy: number | null;
  receivedByName: string | null;
}

/**
 * PENDING: nothing paid yet. PARTIAL: some has gone out. PAID: settled in
 * full. Derived from `paidAmount` vs `amount`, never set directly — see
 * `recordCateringExpensePayment`.
 */
export type CateringExpenseStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export const CATERING_EXPENSE_STATUS_META: Record<CateringExpenseStatus, { label: string; tone: 'green' | 'amber' | 'gold' }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  PARTIAL: { label: 'Partial', tone: 'gold' },
  PAID: { label: 'Paid', tone: 'green' },
};

/**
 * A debt the business owes that is not a vendor bill against one event — a
 * utility bill, a one-off service payment, equipment. `amount` is the TOTAL
 * owed; `paidAmount` is the running total paid against it so far, kept in
 * step with `CateringExpensePaymentRow` below exactly the way a receivable's
 * `paidAmount` is kept in step with its payments.
 */
export interface CateringExpenseRow {
  id: number;
  category: string;
  payee: string;
  amount: number;
  paidAmount: number;
  /** amount - paidAmount, never below zero. */
  balance: number;
  status: CateringExpenseStatus;
  expenseDate: string;
  note: string;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
}

/** One installment against a CateringExpenseRow. Mirrors CateringReceivablePaymentRow. */
export interface CateringExpensePaymentRow {
  id: number;
  payableId: number;
  amount: number;
  paymentDate: string;
  method: string;
  note: string | null;
  paidBy: number | null;
  paidByName: string | null;
}

/**
 * A bill with no dish behind it — a name, a date, and a list of lines. Each
 * line is shaped like a quotation's DISH row (description, qty, unit, rate)
 * but carries no `menuItemId`: a custom bill is deliberately unlinked from the
 * menu, so the operator types the whole line.
 */
export interface CateringCustomBillItemRow {
  id: number;
  billId: number;
  /** DISH is qty x rate; CHARGE is an amount typed as-is, like a quotation's charge band. */
  section: CateringSection;
  description: string;
  qty: number;
  unit: CateringUnit;
  rate: number;
  amount: number;
  sortOrder: number;
}

export interface CateringCustomBillRow {
  id: number;
  billNo: string;
  billTo: string;
  contactNo: string;
  address: string;
  billDate: string;
  grandTotal: number;
  note: string;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  /** Filled by the detail/edit read; the list leaves it undefined. */
  items?: CateringCustomBillItemRow[];
}

/** The catering arm's own trading identity, printed on its slip. */
export interface CateringProfile {
  name: string;
  person: string;
  phone: string;
  address: string;
  /**
   * Whether the standing conditions print on customer documents at all.
   *
   * Off by default: this house hands over a slip with the prices on it and
   * nothing else, and a fresh install should not put words in their mouth.
   * Turning it on prints whatever is in Catering → Rules — and ONLY that.
   * There is deliberately no second, hardcoded source of terms: two places to
   * edit the same paragraph is how a slip ends up contradicting itself.
   */
  showTerms: boolean;
  /** Printed in the slip header beside the status, not in the conditions. */
  taxNote: string;
  quotaPrefix: string;
}

export const CATERING_PROFILE_DEFAULTS: CateringProfile = {
  name: 'Abdul Razzak Catering',
  person: '',
  // Printed beneath the letterhead. Comma-separated numbers each get a line.
  phone: '0334-1669655, 0321-2032532',
  address: '1245/2 Azizabad, F.B. Area, Karachi',
  // Off unless the client deliberately turns it on in Catering -> Settings.
  showTerms: false,
  // Empty by default: the tax line prints only if someone deliberately sets
  // one in Catering -> Settings.
  taxNote: '',
  quotaPrefix: 'ARC',
};
