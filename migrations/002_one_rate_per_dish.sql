-- ═══════════════════════════════════════════════════════════════
-- 002 — ONE RATE PER DISH, AND THE MONEY SCREENS
--
-- The upgrade for a database that ALREADY HOLDS LIVE DATA. Unlike 001 it
-- drops nothing the business owns: every quotation, invoice, payment and
-- customer survives.
--
-- What it does:
--   1. Adds the Receivables / Payables tables, if this database predates them.
--   2. Adds the Custom Bills tables, if this database predates them.
--   3. Removes CATEGORIES entirely — the categories table, the per-category
--      rate variants, and the category columns on quotation, template and
--      custom-bill lines. A dish now carries one rate, so `default_rate` is
--      renamed to `rate` and any dish whose price lived ONLY in a variant has
--      that price carried over before the variants are dropped.
--   4. Renames the business to "Abdul Razzak Catering" — only if it is still
--      sitting on the old built-in default, so a name typed in Settings is
--      never overwritten.
--
-- ── Written to be run twice ──
-- Every step checks the current shape of the database before touching it, so
-- re-running this file is safe and does nothing the second time. MySQL has no
-- `ADD COLUMN IF NOT EXISTS`, hence the PREPARE/EXECUTE around each ALTER;
-- `DO 0` is the no-op branch. Deliberately no stored procedures: this file is
-- pasted into phpMyAdmin AND sent by scripts/migrate.ts, and the latter cannot
-- send a DELIMITER.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ═══════════════════════════════════════════════════════════════
-- 1. Receivables and Payables
--
-- An invoice raised against a person, settled over one or more payments. The
-- header carries the total and a running `paid_amount`; the ledger table holds
-- one row per instalment.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS catering_receivables (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  payer_name    VARCHAR(160) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  paid_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_date DATE NOT NULL,
  status        ENUM('PENDING','PARTIAL','RECEIVED') NOT NULL DEFAULT 'PENDING',
  note          VARCHAR(500) NOT NULL DEFAULT '',
  created_by    INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crecv_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_crecv_date (received_date),
  INDEX idx_crecv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS catering_receivable_payments (
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

CREATE TABLE IF NOT EXISTS catering_expenses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  category     VARCHAR(80) NOT NULL DEFAULT '',
  payee        VARCHAR(160) NOT NULL DEFAULT '',
  amount       DECIMAL(12,2) NOT NULL,
  paid_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  status       ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
  expense_date DATE NOT NULL,
  note         VARCHAR(500) NOT NULL DEFAULT '',
  created_by   INT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cexp_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cexp_date (expense_date),
  INDEX idx_cexp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS catering_payable_payments (
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

-- The instalment columns, for a database that has the tables from an earlier
-- build where a receivable was a single flat amount.
SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_receivables'
                         AND COLUMN_NAME = 'paid_amount'),
  'DO 0',
  'ALTER TABLE catering_receivables ADD COLUMN paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_expenses'
                         AND COLUMN_NAME = 'paid_amount'),
  'DO 0',
  'ALTER TABLE catering_expenses ADD COLUMN paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Widening an ENUM to the value set it already has is a no-op, so these are
-- unconditional.
ALTER TABLE catering_receivables
  MODIFY COLUMN status ENUM('PENDING','PARTIAL','RECEIVED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE catering_expenses
  MODIFY COLUMN status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING';

-- Anything already marked settled before instalments existed keeps its
-- history: the full amount is recorded as one payment, so the ledger and the
-- header agree.
INSERT INTO catering_receivable_payments (receivable_id, amount, payment_date, method, note, received_by)
SELECT r.id, r.amount, r.received_date, 'CASH', 'Recorded before instalments were tracked', r.created_by
  FROM catering_receivables r
 WHERE r.status = 'RECEIVED'
   AND NOT EXISTS (SELECT 1 FROM catering_receivable_payments p WHERE p.receivable_id = r.id);

UPDATE catering_receivables r
   SET r.paid_amount = COALESCE((SELECT SUM(p.amount) FROM catering_receivable_payments p
                                  WHERE p.receivable_id = r.id), 0)
 WHERE r.paid_amount = 0;

INSERT INTO catering_payable_payments (payable_id, amount, payment_date, method, note, paid_by)
SELECT e.id, e.amount, e.expense_date, 'CASH', 'Recorded before instalments were tracked', e.created_by
  FROM catering_expenses e
 WHERE e.status = 'PAID'
   AND NOT EXISTS (SELECT 1 FROM catering_payable_payments p WHERE p.payable_id = e.id);

UPDATE catering_expenses e
   SET e.paid_amount = COALESCE((SELECT SUM(p.amount) FROM catering_payable_payments p
                                  WHERE p.payable_id = e.id), 0)
 WHERE e.paid_amount = 0;

-- ═══════════════════════════════════════════════════════════════
-- 2. Custom bills
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS catering_custom_bills (
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

CREATE TABLE IF NOT EXISTS catering_custom_bill_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  bill_id     INT NOT NULL,
  description VARCHAR(300) NOT NULL,
  qty         DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit        ENUM('KG','GRAM','LITRE','ML','PCS','PLATE') NOT NULL DEFAULT 'KG',
  rate        DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ccbi_bill FOREIGN KEY (bill_id) REFERENCES catering_custom_bills(id) ON DELETE CASCADE,
  INDEX idx_ccbi_bill (bill_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A bill line used to be a flat description + amount. Give it the quantity,
-- unit and rate a dish line has; existing lines keep their amount and simply
-- read as a quantity of one.
SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_custom_bill_items'
                         AND COLUMN_NAME = 'qty'),
  'DO 0',
  'ALTER TABLE catering_custom_bill_items
     ADD COLUMN qty DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER description,
     ADD COLUMN unit ENUM(''KG'',''GRAM'',''LITRE'',''ML'',''PCS'',''PLATE'') NOT NULL DEFAULT ''KG'' AFTER qty,
     ADD COLUMN rate DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER unit');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE catering_custom_bill_items SET qty = 1, rate = amount WHERE qty = 0 AND amount > 0;

INSERT INTO settings (`key`, `value`)
SELECT 'catering.bill_prefix', 'CB' FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'catering.bill_prefix');

-- ═══════════════════════════════════════════════════════════════
-- 3. Categories, removed
--
-- A dish used to carry one priced variant per category (QORMA as BEEF, as
-- CHICKEN) and a quotation line had to pick the category before it had a
-- price. This house quotes one rate per dish.
--
-- ORDER MATTERS: the surviving rate is rescued out of the variants BEFORE the
-- variant table is dropped, or a dish priced only through its categories would
-- silently fall to zero.
-- ═══════════════════════════════════════════════════════════════

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.TABLES
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_menu_item_categories')
               AND EXISTS(SELECT 1 FROM information_schema.COLUMNS
                           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_menu_items'
                             AND COLUMN_NAME = 'default_rate'),
  'UPDATE catering_menu_items m
      SET m.default_rate = COALESCE((SELECT MAX(v.rate) FROM catering_menu_item_categories v
                                      WHERE v.menu_item_id = m.id AND v.is_active = 1), m.default_rate)
    WHERE m.default_rate = 0',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

DROP TABLE IF EXISTS catering_menu_item_categories;

-- One dish, one rate. `default_rate` only ever meant "the price when this dish
-- has no categories", and there are no categories now.
SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_menu_items'
                         AND COLUMN_NAME = 'default_rate'),
  'ALTER TABLE catering_menu_items CHANGE default_rate rate DECIMAL(12,2) NOT NULL DEFAULT 0',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_menu_items'
                         AND COLUMN_NAME = 'category'),
  'ALTER TABLE catering_menu_items DROP COLUMN category',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- The line tables. The foreign key is looked up by the column it constrains
-- rather than by name, so a database whose key was created under a different
-- name still upgrades.
SET @fk := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_quotation_items'
               AND COLUMN_NAME = 'category_id' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);
SET @sql := IF(@fk IS NULL, 'DO 0',
  CONCAT('ALTER TABLE catering_quotation_items DROP FOREIGN KEY `', @fk, '`'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_quotation_items'
                         AND COLUMN_NAME = 'category_id'),
  'ALTER TABLE catering_quotation_items DROP COLUMN category_id',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_quotation_items'
                         AND COLUMN_NAME = 'category'),
  'ALTER TABLE catering_quotation_items DROP COLUMN category',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_template_items'
               AND COLUMN_NAME = 'category_id' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);
SET @sql := IF(@fk IS NULL, 'DO 0',
  CONCAT('ALTER TABLE catering_template_items DROP FOREIGN KEY `', @fk, '`'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_template_items'
                         AND COLUMN_NAME = 'category_id'),
  'ALTER TABLE catering_template_items DROP COLUMN category_id',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_template_items'
                         AND COLUMN_NAME = 'category'),
  'ALTER TABLE catering_template_items DROP COLUMN category',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_custom_bill_items'
                         AND COLUMN_NAME = 'category'),
  'ALTER TABLE catering_custom_bill_items DROP COLUMN category',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

DROP TABLE IF EXISTS catering_categories;

-- ═══════════════════════════════════════════════════════════════
-- 4. The trading name
--
-- Only when it is still the old built-in default. A name the client typed in
-- Settings is theirs and is left exactly as it is.
-- ═══════════════════════════════════════════════════════════════

UPDATE settings SET `value` = 'Abdul Razzak Catering'
 WHERE `key` = 'catering.name' AND `value` = 'Abdul Razak Catering Service';

UPDATE settings SET `value` = 'Abdul Razzak Catering'
 WHERE `key` = 'brand.name' AND `value` = 'Abdul Razak Catering Service';

UPDATE settings SET `value` = ''
 WHERE `key` = 'brand.tagline' AND `value` = 'Catering Service';

UPDATE settings SET `value` = 'Abdul Razzak Catering — Wedding & Event Caterers in Karachi'
 WHERE `key` = 'brand.siteName' AND `value` = 'Abdul Razak Catering Service — Wedding & Event Caterers in Karachi';
