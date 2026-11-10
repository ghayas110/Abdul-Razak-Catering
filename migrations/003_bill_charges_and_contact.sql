-- ═══════════════════════════════════════════════════════════════
-- 003 — CHARGES ON CUSTOM BILLS, AND THE HOUSE CONTACT DETAILS
--
-- For a database that ALREADY HOLDS LIVE DATA. Nothing is dropped and no
-- existing value is overwritten.
--
--   1. Custom bill lines gain a `section`, like quotation lines: DISH is
--      qty x rate, CHARGE is an amount typed as-is (transport, service).
--      Every existing line becomes a DISH line, which is what it already was.
--   2. The shop address and phone numbers that print beneath the letterhead
--      are filled in — ONLY where Settings has them missing or blank. Anything
--      the client has already typed in Catering -> Settings is left alone.
--
-- Safe to run twice: each step checks the database before changing it.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_custom_bill_items'
                         AND COLUMN_NAME = 'section'),
  'DO 0',
  'ALTER TABLE catering_custom_bill_items
     ADD COLUMN section ENUM(''DISH'',''CHARGE'') NOT NULL DEFAULT ''DISH'' AFTER bill_id');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

INSERT INTO settings (`key`, `value`)
SELECT 'catering.address', '1245/2 Azizabad, F.B. Area, Karachi' FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'catering.address');
UPDATE settings SET `value` = '1245/2 Azizabad, F.B. Area, Karachi'
 WHERE `key` = 'catering.address' AND TRIM(`value`) = '';

INSERT INTO settings (`key`, `value`)
SELECT 'catering.phone', '0334-1669655, 0321-2032532' FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'catering.phone');
UPDATE settings SET `value` = '0334-1669655, 0321-2032532'
 WHERE `key` = 'catering.phone' AND TRIM(`value`) = '';
