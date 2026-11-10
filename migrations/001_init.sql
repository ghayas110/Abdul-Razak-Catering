-- ═══════════════════════════════════════════════════════════════
-- ABDUL RAZZAK CATERING — SCHEMA
--
-- One catering business: customers, a priced menu, quotations that become
-- invoices, the vendors those events are bought from, and the books that fall
-- out of the two.
--
-- Consolidated on purpose. This descends from a larger system that also ran a
-- ballroom, and carried fourteen incremental migrations to get from its first
-- shape to this one. None of that history is useful to an install that starts
-- here, and replaying it would create a dozen tables this application never
-- reads. What follows is the FINAL shape, written once.
--
-- ⚠ DESTRUCTIVE. Every table is dropped and rebuilt. `scripts/migrate.ts`
-- refuses to run this file against a database that already has tables unless
-- --reset is passed, so a later `npm run db:migrate` cannot wipe live data.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS catering_template_items;
DROP TABLE IF EXISTS catering_templates;
DROP TABLE IF EXISTS catering_payables;
DROP TABLE IF EXISTS catering_vendors;
DROP TABLE IF EXISTS catering_payments;
DROP TABLE IF EXISTS catering_quotation_items;
DROP TABLE IF EXISTS catering_quotations;
DROP TABLE IF EXISTS catering_menu_items;
DROP TABLE IF EXISTS catering_customers;
DROP TABLE IF EXISTS catering_custom_bill_items;
DROP TABLE IF EXISTS catering_custom_bills;
DROP TABLE IF EXISTS catering_receivable_payments;
DROP TABLE IF EXISTS catering_receivables;
DROP TABLE IF EXISTS catering_payable_payments;
DROP TABLE IF EXISTS catering_expenses;
DROP TABLE IF EXISTS catering_rules;
DROP TABLE IF EXISTS notification_reads;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════════
-- PEOPLE AND ACCESS
-- ═══════════════════════════════════════════════════════════════

-- The payroll record. Separate from `users` because most of the kitchen has no
-- login and several logins are not on the payroll; the two are joined only
-- where one person is both.
CREATE TABLE employees (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  phone          VARCHAR(40) NULL,
  designation    VARCHAR(80) NOT NULL DEFAULT 'Staff',
  monthly_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  joined_date    DATE NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `permissions` is a JSON array that OVERRIDES the role's defaults when set.
-- Null means "use the role's defaults", which is what almost every account
-- does; the column exists because the client wants to grant one person one
-- extra screen without inventing a role for them.
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('SUPER_ADMIN','OWNER','MANAGER','ACCOUNTANT','VIEWER') NOT NULL DEFAULT 'VIEWER',
  permissions   JSON NULL,
  -- The staff record this login belongs to. NULL = login only, not on payroll.
  employee_id   INT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  UNIQUE KEY uq_user_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per signed-in DEVICE, so the owner can see where the account is
-- open and revoke a lost phone without changing everyone's password.
CREATE TABLE user_sessions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  sid          CHAR(36) NOT NULL,
  user_agent   VARCHAR(400) NULL,
  device_label VARCHAR(120) NULL,
  -- Owner-supplied name ("Reception iPad"). Wins over device_label when set,
  -- which is how an "Unknown device" gets a useful name.
  custom_label VARCHAR(120) NULL,
  ip           VARCHAR(64) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at   DATETIME NULL,
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sess_sid (sid),
  INDEX idx_sess_user (user_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════
-- HOUSEKEEPING
-- ═══════════════════════════════════════════════════════════════

-- Key/value, deliberately. The business profile, the catering trading
-- identity and the quotation prefixes all live here so the client edits them
-- in Settings instead of waiting for a deploy.
CREATE TABLE settings (
  `key`   VARCHAR(80) PRIMARY KEY,
  `value` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  action      VARCHAR(40) NOT NULL,
  entity      VARCHAR(60) NOT NULL,
  entity_id   VARCHAR(60) NULL,
  before_json JSON NULL,
  after_json  JSON NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Enquiries from the public website. Not customers yet.
CREATE TABLE leads (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  phone      VARCHAR(40) NOT NULL,
  event_date DATE NULL,
  message    VARCHAR(500) NULL,
  source     VARCHAR(40) NOT NULL DEFAULT 'WEBSITE',
  status     ENUM('NEW','CONTACTED','CONVERTED','CLOSED') NOT NULL DEFAULT 'NEW',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  type       ENUM('BOOKING','ENQUIRY','LEAD','PAYMENT','REVIEW') NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       VARCHAR(500) NULL,
  -- Where the bell menu sends you when the notification is clicked.
  url        VARCHAR(255) NULL,
  entity     VARCHAR(40) NULL,
  entity_id  INT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_created (created_at),
  INDEX idx_notif_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Read state is per user, not per notification: the same enquiry is unread
-- for one person and dealt with by another.
CREATE TABLE notification_reads (
  notification_id INT NOT NULL,
  user_id         INT NOT NULL,
  read_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT fk_nread_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_nread_user  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE push_subscriptions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  endpoint     VARCHAR(500) NOT NULL,
  p256dh       VARCHAR(255) NOT NULL,
  auth         VARCHAR(255) NOT NULL,
  device_label VARCHAR(120) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- Endpoints are long; a 191-char prefix is unique in practice and fits the
  -- utf8mb4 index limit.
  UNIQUE KEY uq_push_endpoint (endpoint(191)),
  INDEX idx_push_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════
-- CATERING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE catering_customers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  phone      VARCHAR(40) NOT NULL DEFAULT '',
  phone2     VARCHAR(40) NOT NULL DEFAULT '',
  address    VARCHAR(400) NOT NULL DEFAULT '',
  note       VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ccust_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The rate catalogue: one dish, one unit, ONE rate. `unit` is the unit the
-- rate is quoted in; a line may be ordered in a smaller one (GRAM, ML) and is
-- converted before the amount is worked out. PLATE is a count of heads and
-- converts to nothing else.
CREATE TABLE catering_menu_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(160) NOT NULL,
  unit         ENUM('KG','GRAM','LITRE','ML','CUP','PCS','NOS','PLATE') NOT NULL DEFAULT 'KG',
  rate         DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cmenu_name (name),
  INDEX idx_cmenu_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quotations AND invoices, distinguished by `doc_type`.
--
-- A quotation is the estimate given before the booking; an invoice is what is
-- billed after the event. They are separate RECORDS with separate line items —
-- an invoice is copied from a quotation and then diverges as final quantities
-- settle — but they share this table, because otherwise every column, query
-- and screen would exist twice. `source_quotation_id` remembers the copy.
CREATE TABLE catering_quotations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  quota_no            VARCHAR(40) NOT NULL,
  doc_type            ENUM('QUOTATION','INVOICE') NOT NULL DEFAULT 'QUOTATION',
  source_quotation_id INT NULL,
  customer_id         INT NULL,
  -- Snapshotted onto the document: the slip is handed over and must not change
  -- if the customer record is later edited.
  customer_name       VARCHAR(160) NOT NULL DEFAULT '',
  contact_no          VARCHAR(40) NOT NULL DEFAULT '',
  place_of_function   VARCHAR(200) NOT NULL DEFAULT '',
  quotation_date      DATE NOT NULL,
  -- Shown as "Event date" throughout. The column keeps its original name: it
  -- is referenced across queries, the WhatsApp message and the printed slip,
  -- and renaming a column to change a label is churn with a migration on it.
  delivery_date       DATE NULL,
  persons             INT NOT NULL DEFAULT 0,
  -- Every billed line. Printed as the subtotal above the grand total, which it
  -- always equals; both are stored so the slip never recomputes.
  items_total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
  status              ENUM('QUOTATION','CONFIRMED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'QUOTATION',
  note                VARCHAR(1000) NULL,
  created_by          INT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cq_customer FOREIGN KEY (customer_id) REFERENCES catering_customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_cq_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_cq_no (quota_no),
  INDEX idx_cq_date (quotation_date),
  INDEX idx_cq_delivery (delivery_date),
  INDEX idx_cq_status (status),
  INDEX idx_cq_doctype (doc_type, quotation_date),
  INDEX idx_cq_source (source_quotation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Both bands of the slip in one table, told apart by `section`:
--   DISH    the numbered dishes, with quantity and rate
--   CHARGE  TRANSPORT / SERVICE — an amount with no qty or rate
-- One table preserves the operator's row order within each band and lets the
-- slip render from a single ordered query.
CREATE TABLE catering_quotation_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  section      ENUM('DISH','CHARGE') NOT NULL DEFAULT 'DISH',
  menu_item_id INT NULL,
  description  VARCHAR(200) NOT NULL,
  qty          DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit         ENUM('KG','GRAM','LITRE','ML','CUP','PCS','NOS','PLATE') NOT NULL DEFAULT 'KG',
  rate         DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_cqi_quotation FOREIGN KEY (quotation_id) REFERENCES catering_quotations(id) ON DELETE CASCADE,
  -- SET NULL, not CASCADE: retiring a dish from the menu must not gut the
  -- quotations that used it. The line keeps its description and rate.
  CONSTRAINT fk_cqi_menu FOREIGN KEY (menu_item_id) REFERENCES catering_menu_items(id) ON DELETE SET NULL,
  INDEX idx_cqi_quotation (quotation_id, section, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE catering_payments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  method       VARCHAR(40) NOT NULL DEFAULT 'CASH',
  received_by  INT NULL,
  note         VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cpay_quotation FOREIGN KEY (quotation_id) REFERENCES catering_quotations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpay_user FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cpay_quotation (quotation_id),
  INDEX idx_cpay_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A debt owed to the business that is not a quotation — a personal loan, a
-- gift promised in installments, anything worth keeping on record. `amount`
-- is the TOTAL owed; `paid_amount` is a running total kept in step with
-- `catering_receivable_payments` below, exactly the way a quotation's
-- `paid_amount` is kept in step with `catering_payments`. `payer_name` is
-- free text on purpose — most of these payers (a father, a friend, a one-off
-- contact) will never be a `catering_customers` row.
CREATE TABLE catering_receivables (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  payer_name    VARCHAR(160) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  paid_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_date DATE NOT NULL,
  -- PENDING: nothing paid yet. PARTIAL: some of it has come in. RECEIVED:
  -- paid in full. Derived from paid_amount vs amount on every payment
  -- recorded, never set directly — see recordCateringReceivablePayment.
  status        ENUM('PENDING','PARTIAL','RECEIVED') NOT NULL DEFAULT 'PENDING',
  note          VARCHAR(500) NOT NULL DEFAULT '',
  created_by    INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crecv_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_crecv_date (received_date),
  INDEX idx_crecv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per installment against a receivable above. Mirrors
-- catering_payments exactly, for exactly the same reason: a receivable can
-- be settled in several payments over time, and each one needs its own date,
-- method and note rather than being folded into a single running number.
CREATE TABLE catering_receivable_payments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  receivable_id INT NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  payment_date  DATE NOT NULL,
  method        VARCHAR(40) NOT NULL DEFAULT 'CASH',
  note          VARCHAR(255) NULL,
  received_by   INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crecvpay_receivable FOREIGN KEY (receivable_id) REFERENCES catering_receivables(id) ON DELETE CASCADE,
  CONSTRAINT fk_crecvpay_user FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_crecvpay_receivable (receivable_id),
  INDEX idx_crecvpay_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A debt the business owes that is not a vendor bill against one event: a
-- utility bill, a one-off service payment, equipment. Same shape as
-- catering_receivables, mirrored exactly: `amount` is the TOTAL owed,
-- `paid_amount` a running total kept in step with catering_payable_payments
-- below. `category` is legacy (an earlier version of this screen collected
-- it; the field survives so old rows keep their data, nothing writes to it
-- any more).
CREATE TABLE catering_expenses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  category     VARCHAR(80) NOT NULL DEFAULT '',
  payee        VARCHAR(160) NOT NULL DEFAULT '',
  amount       DECIMAL(12,2) NOT NULL,
  paid_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- PENDING: nothing paid yet. PARTIAL: some has gone out. PAID: settled in
  -- full. Derived from paid_amount vs amount on every payment recorded, never
  -- set directly — see recordCateringExpensePayment.
  status       ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
  expense_date DATE NOT NULL,
  note         VARCHAR(500) NOT NULL DEFAULT '',
  created_by   INT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cexp_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cexp_date (expense_date),
  INDEX idx_cexp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per installment paid against a payable above. Mirrors
-- catering_receivable_payments exactly, in the opposite direction: money
-- leaving rather than arriving.
CREATE TABLE catering_payable_payments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  payable_id   INT NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  method       VARCHAR(40) NOT NULL DEFAULT 'CASH',
  note         VARCHAR(255) NULL,
  paid_by      INT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cpaypay_payable FOREIGN KEY (payable_id) REFERENCES catering_expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpaypay_user FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cpaypay_payable (payable_id),
  INDEX idx_cpaypay_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Someone the kitchen buys from: butcher, decorator, crockery hire, transport.
CREATE TABLE catering_vendors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  category   VARCHAR(60) NOT NULL DEFAULT '',
  phone      VARCHAR(40) NOT NULL DEFAULT '',
  note       VARCHAR(500) NOT NULL DEFAULT '',
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cvendor_name (name),
  INDEX idx_cvendor_active (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- What one event owes one vendor.
--
-- `paid_amount` rather than a settled flag: part payments to a butcher are
-- normal, and the ledger needs what is still outstanding, not just yes or no.
--
-- Bills attach to the EVENT ROOT — the original quotation's id, or the
-- invoice's own id when no quotation sits behind it — so a bill entered before
-- the invoice exists and one entered after land on the same event instead of
-- splitting the ledger in two.
CREATE TABLE catering_payables (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  event_id    INT NOT NULL,
  vendor_id   INT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date    DATE NULL,
  note        VARCHAR(500) NOT NULL DEFAULT '',
  created_by  INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cpayable_event FOREIGN KEY (event_id) REFERENCES catering_quotations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpayable_vendor FOREIGN KEY (vendor_id) REFERENCES catering_vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_cpayable_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cpayable_event (event_id),
  INDEX idx_cpayable_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The standing conditions printed on every quotation. Flat and ordered:
-- unlike a booking, catering has no per-document rule lines, because the
-- conditions are the same on every slip.
CREATE TABLE catering_rules (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  text       VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crule_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A saved set of lines. Applying one fills a NEW quotation with those lines;
-- the quotation is then edited freely and nothing it does reaches back here.
--
-- Its own tables rather than another `doc_type`. A template is not a document:
-- no customer, no date, no money owed, and it must never be picked up by the
-- event ledger, the reports or the quota numbering. Separate tables make that
-- structural instead of a filter everyone has to remember.
CREATE TABLE catering_templates (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  -- The headcount it was costed for, carried onto the quotation as a starting
  -- point, because the line quantities were chosen to match it.
  persons     INT NOT NULL DEFAULT 0,
  note        VARCHAR(1000) NOT NULL DEFAULT '',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_by  INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ctpl_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_ctpl_name (name),
  INDEX idx_ctpl_active (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mirrors catering_quotation_items exactly, so applying a template is a
-- column-for-column copy with no translation step to get wrong.
CREATE TABLE catering_template_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  template_id  INT NOT NULL,
  section      ENUM('DISH','CHARGE') NOT NULL DEFAULT 'DISH',
  menu_item_id INT NULL,
  description  VARCHAR(200) NOT NULL,
  qty          DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit         ENUM('KG','GRAM','LITRE','ML','CUP','PCS','NOS','PLATE') NOT NULL DEFAULT 'KG',
  rate         DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ctpli_template FOREIGN KEY (template_id) REFERENCES catering_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_ctpli_menu FOREIGN KEY (menu_item_id) REFERENCES catering_menu_items(id) ON DELETE SET NULL,
  INDEX idx_ctpli_template (template_id, section, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A bill with no dish behind it: a name, a date, and a list of charges — each
-- just a description and an amount, the same shape as a quotation's CHARGE
-- band (transport, service). For anything that doesn't fit the menu-priced
-- quotation flow but still needs a proper printed bill: a one-off service, a
-- reimbursement, a private arrangement.
CREATE TABLE catering_custom_bills (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  bill_no     VARCHAR(40) NOT NULL,
  bill_to     VARCHAR(160) NOT NULL DEFAULT '',
  contact_no  VARCHAR(40) NOT NULL DEFAULT '',
  address     VARCHAR(300) NOT NULL DEFAULT '',
  bill_date   DATE NOT NULL,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  note        VARCHAR(1000) NOT NULL DEFAULT '',
  created_by  INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccb_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_ccb_no (bill_no),
  INDEX idx_ccb_date (bill_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per line on a custom bill, in the same shape as a quotation's DISH
-- line — description, qty, unit, rate — but with no menu_item_id, because a
-- custom bill is deliberately unlinked from the menu. `amount` is
-- qty/unit/rate run through
-- `cateringLineAmount`, stored rather than derived on read for the same
-- reason a quotation line's amount is: what printed must never silently
-- change because a formula changed later.
CREATE TABLE catering_custom_bill_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  bill_id     INT NOT NULL,
  -- DISH: qty x rate, same arithmetic as a quotation dish line.
  -- CHARGE: transport, service — an amount typed as-is, no qty or rate.
  section     ENUM('DISH','CHARGE') NOT NULL DEFAULT 'DISH',
  description VARCHAR(300) NOT NULL,
  qty         DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit        ENUM('KG','GRAM','LITRE','ML','CUP','PCS','NOS','PLATE') NOT NULL DEFAULT 'KG',
  rate        DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ccbi_bill FOREIGN KEY (bill_id) REFERENCES catering_custom_bills(id) ON DELETE CASCADE,
  INDEX idx_ccbi_bill (bill_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════
-- SETTINGS THE APP EXPECTS TO EXIST
--
-- Only the keys with a sensible universal answer. The trading identity —
-- phone, address, the name on the slip — is deliberately NOT seeded with
-- invented values; it is the first thing to fill in under Settings.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO settings (`key`, `value`) VALUES
  ('catering.name',           'Abdul Razzak Catering'),
  ('catering.address',        '1245/2 Azizabad, F.B. Area, Karachi'),
  ('catering.phone',          '0334-1669655, 0321-2032532'),
  ('catering.terms',          'Terms of Payment: 75% Advance & Balance After Program.'),
  ('catering.note',           'Prices quoted are based on prevailing market rates and are held for 15 days from the date of this quotation. Final billing is against the headcount confirmed 48 hours before the event.'),
  ('catering.quota_prefix',   'ARC'),
  ('catering.invoice_prefix', 'ARI'),
  ('catering.bill_prefix',    'CB');
