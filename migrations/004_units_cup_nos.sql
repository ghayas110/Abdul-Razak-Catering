-- ═══════════════════════════════════════════════════════════════
-- 004 — TWO MORE UNITS: cup and nos
--
-- For a database that ALREADY HOLDS LIVE DATA. Adds 'CUP' and 'NOS' to the
-- unit list on every table that stores a line's unit: the menu, quotation and
-- invoice lines, template lines, and custom bill lines.
--
-- Widening an ENUM keeps every row exactly as it is — nothing is rewritten and
-- no existing unit changes meaning. Re-running the file simply sets the same
-- definition again, so it is safe to run twice.
--
-- The guards are there for the one case that would otherwise error out: a
-- database old enough not to have the custom bills table yet.
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

SET @units := "ENUM('KG','GRAM','LITRE','ML','CUP','PCS','NOS','PLATE') NOT NULL DEFAULT 'KG'";

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_menu_items'
                         AND COLUMN_NAME = 'unit'),
  CONCAT('ALTER TABLE catering_menu_items MODIFY COLUMN unit ', @units),
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_quotation_items'
                         AND COLUMN_NAME = 'unit'),
  CONCAT('ALTER TABLE catering_quotation_items MODIFY COLUMN unit ', @units),
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_template_items'
                         AND COLUMN_NAME = 'unit'),
  CONCAT('ALTER TABLE catering_template_items MODIFY COLUMN unit ', @units),
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catering_custom_bill_items'
                         AND COLUMN_NAME = 'unit'),
  CONCAT('ALTER TABLE catering_custom_bill_items MODIFY COLUMN unit ', @units),
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
