/**
 * Seed data for a fresh install.
 *
 * Enough to sign in and raise a real quotation on the first day: the accounts,
 * the categories a Karachi catering menu is priced under, a starter rate card,
 * the standing conditions that print on every slip, and the vendors most
 * events are bought from.
 *
 * Deliberately NOT seeded: the trading identity (the phone, the address, the
 * name on the letterhead) and any customer, quotation or payment. Invented
 * contact details end up printed on a real slip, and invented money ends up in
 * a real report.
 *
 *   npm run db:seed        (or `npm run db:reset` to rebuild the schema first)
 */
import { config as loadEnv } from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { getConnectionConfig } from '../src/lib/db';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' }); // production: .env next to server.js

/**
 * The password every seeded account starts on.
 *
 * Overridable so a production seed is not run with a value that is written
 * down in the repository. Change it from Account -> Password on first sign-in
 * either way.
 */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Catering123';

/** The CATEGORIES column on the slip. */
const CATEGORIES = [
  'CHICKEN', 'BEEF', 'MUTTON', 'FISH', 'VEGETABLE',
  'BAR B Q', 'DEEP FRY', 'RICE', 'BREAD', 'SALAD', 'SWEET', 'DRINKS',
];

/**
 * A starter rate card.
 *
 * `[dish, unit, categories it sells under]` — the rates are left at zero on
 * purpose. A price the kitchen did not set is worse than no price: it prints
 * on a quotation and nobody notices it was a guess.
 */
const MENU: [string, 'KG' | 'LITRE' | 'PCS' | 'PLATE', string[]][] = [
  ['QORMA',            'KG',    ['CHICKEN', 'BEEF', 'MUTTON']],
  ['KARAHI',           'KG',    ['CHICKEN', 'BEEF', 'MUTTON']],
  ['NIHARI',           'KG',    ['BEEF', 'MUTTON']],
  ['HALEEM',           'KG',    ['CHICKEN', 'BEEF']],
  ['BIRYANI',          'PLATE', ['CHICKEN', 'BEEF', 'MUTTON']],
  ['PULAO',            'PLATE', ['CHICKEN', 'BEEF']],
  ['WHITE RICE',       'PLATE', ['RICE']],
  ['SEEKH KABAB',      'PCS',   ['BAR B Q']],
  ['MALAI BOTI',       'KG',    ['BAR B Q']],
  ['CHICKEN TIKKA',    'PCS',   ['BAR B Q']],
  ['FISH FRY',         'KG',    ['FISH', 'DEEP FRY']],
  ['CHICKEN BROAST',   'PCS',   ['DEEP FRY']],
  ['MIX VEGETABLE',    'KG',    ['VEGETABLE']],
  ['DAAL MASH',        'KG',    ['VEGETABLE']],
  ['NAAN',             'PCS',   ['BREAD']],
  ['ROGHNI NAAN',      'PCS',   ['BREAD']],
  ['RAITA',            'KG',    ['SALAD']],
  ['RUSSIAN SALAD',    'KG',    ['SALAD']],
  ['KHEER',            'PLATE', ['SWEET']],
  ['GULAB JAMUN',      'PCS',   ['SWEET']],
  ['ICE CREAM',        'PLATE', ['SWEET']],
  ['SOFT DRINK',       'LITRE', ['DRINKS']],
  ['MINERAL WATER',    'PCS',   ['DRINKS']],
];

/** The conditions printed under the terms on every quotation. */
const RULES = [
  'Prices are per the quantities stated above. Any increase on the day is billed separately.',
  'Final headcount must be confirmed at least 48 hours before the event.',
  'Crockery, cutlery and serving staff are charged separately unless stated on this quotation.',
  'Delivery and setup times are as agreed at the time of booking.',
  'Cancellation within 72 hours of the event forfeits the advance.',
];

/** Who most events are bought from. Phones are filled in by the office. */
const VENDORS: [string, string][] = [
  ['Butcher', 'MEAT'],
  ['Vegetable Market', 'GROCERY'],
  ['Decorator', 'DECOR'],
  ['Crockery Hire', 'CROCKERY'],
  ['Transport', 'TRANSPORT'],
  ['Waiter Supply', 'STAFF'],
];

async function main() {
  const cfg = getConnectionConfig();
  const conn = await mysql.createConnection({ ...cfg, multipleStatements: true });
  console.log(`→ Seeding ${cfg.database} …`);

  // Order matters: children before parents, and foreign keys off while the
  // truncates run, because TRUNCATE ignores ON DELETE CASCADE.
  await conn.query(`
    SET FOREIGN_KEY_CHECKS = 0;
    TRUNCATE catering_template_items; TRUNCATE catering_templates;
    TRUNCATE catering_payables;       TRUNCATE catering_vendors;
    TRUNCATE catering_payments;       TRUNCATE catering_quotation_items;
    TRUNCATE catering_quotations;     TRUNCATE catering_menu_item_categories;
    TRUNCATE catering_menu_items;     TRUNCATE catering_categories;
    TRUNCATE catering_customers;      TRUNCATE catering_rules;
    TRUNCATE notification_reads;      TRUNCATE notifications;
    TRUNCATE push_subscriptions;      TRUNCATE user_sessions;
    TRUNCATE audit_log;               TRUNCATE leads;
    TRUNCATE users;                   TRUNCATE employees;
    SET FOREIGN_KEY_CHECKS = 1;
  `);

  // ── Accounts ──
  // The Owner holds every catering permission through the role defaults, so
  // `permissions` stays NULL and the role stays the single source of truth.
  console.log('  · users');
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  await conn.query(
    `INSERT INTO users (name, email, password_hash, role, permissions, is_active) VALUES ?`,
    [[
      ['Super Admin', 'admin@abdulrazakcatering.com',  hash(SEED_PASSWORD), 'SUPER_ADMIN', null, 1],
      ['Abdul Razak', 'owner@abdulrazakcatering.com',  hash(SEED_PASSWORD), 'OWNER',       null, 1],
      ['Office',      'office@abdulrazakcatering.com', hash(SEED_PASSWORD), 'MANAGER',     null, 1],
    ]],
  );

  // ── Categories ──
  console.log('  · categories');
  await conn.query(
    `INSERT INTO catering_categories (name, sort_order, is_active) VALUES ?`,
    [CATEGORIES.map((name, i) => [name, i * 10, 1])],
  );
  const [catRows] = await conn.query<any[]>(`SELECT id, name FROM catering_categories`);
  const catId = new Map<string, number>(catRows.map((c: any) => [c.name, Number(c.id)]));

  // ── Menu ──
  console.log('  · menu');
  await conn.query(
    `INSERT INTO catering_menu_items (name, unit, default_rate, sort_order, is_active) VALUES ?`,
    [MENU.map(([name, unit], i) => [name, unit, 0, i * 10, 1])],
  );
  const [itemRows] = await conn.query<any[]>(`SELECT id, name FROM catering_menu_items`);
  const itemId = new Map<string, number>(itemRows.map((r: any) => [r.name, Number(r.id)]));

  const variants = MENU.flatMap(([name, , cats]) =>
    cats
      .map((c) => [itemId.get(name), catId.get(c), 0, 1])
      .filter(([i, c]) => i != null && c != null));
  if (variants.length) {
    await conn.query(
      `INSERT INTO catering_menu_item_categories (menu_item_id, category_id, rate, is_active) VALUES ?`,
      [variants],
    );
  }

  // ── Standing conditions ──
  console.log('  · rules');
  await conn.query(
    `INSERT INTO catering_rules (text, sort_order, is_active) VALUES ?`,
    [RULES.map((text, i) => [text, i * 10, 1])],
  );

  // ── Vendors ──
  console.log('  · vendors');
  await conn.query(
    `INSERT INTO catering_vendors (name, category, phone, is_active) VALUES ?`,
    [VENDORS.map(([name, category]) => [name, category, '', 1])],
  );

  await conn.end();

  console.log('');
  console.log('✓ Seeded.');
  console.log('');
  console.log(`  Sign in:  admin@abdulrazakcatering.com  /  ${SEED_PASSWORD}`);
  console.log('');
  console.log('  First two things to do:');
  console.log('    1. Settings -> Business Profile: the name, phone and address');
  console.log('       that print on every quotation are deliberately blank.');
  console.log('    2. Menu & Rates: every dish is seeded at 0. Set the real rates.');
  console.log('');
}

main().catch((err) => { console.error(err); process.exit(1); });
