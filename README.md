# Abdul Razak Catering Service

The public website and the staff portal behind it, in one Next.js app.

Next.js 15 · TypeScript · raw MySQL (mysql2, **no ORM**) · Tailwind · Framer Motion · NextAuth.

Currency **PKR (Rs.)** · Locale **en-PK** · Dates **DD-MMM-YY**.

---

## Quick start

1. **MySQL** — start MAMP (MySQL on `127.0.0.1:8889`, user `root`, pass `root`). Credentials live in `.env.local`.
2. **Install**
   ```bash
   npm install --legacy-peer-deps
   ```
3. **Create the schema and seed it**
   ```bash
   npm run db:reset
   ```
4. **Run**
   ```bash
   npm run dev
   ```
   `http://localhost:3000` is the public site, `http://localhost:3000/login` the staff portal.

### Seeded logins

All three start on the same password, `Catering123` (override with `SEED_PASSWORD`). Change them from Account on first sign-in.

| Role | Email | Sees |
|---|---|---|
| Super Admin | `admin@abdulrazakcatering.com` | Everything, including user accounts |
| Owner | `owner@abdulrazakcatering.com` | Everything except managing other accounts |
| Manager | `office@abdulrazakcatering.com` | Quotations, invoices, menu, customers, enquiries |

### Two things to do before showing anyone

Both are deliberate blanks, not omissions. See the note at the top of
`src/lib/brand-info.ts`.

1. **Settings → Business Profile.** The phone, WhatsApp, email and address are
   empty. The website hides its call and WhatsApp buttons and the printed slip
   drops its footer line until they are filled in.
2. **Menu & Rates.** Every seeded dish is priced at 0. A rate nobody set is
   worse than no rate, because it prints on a quotation and looks deliberate.

---

## What is here

**The public site** (`/`) is four sections: a split hero, the occasions this
kitchen caters, the menu in three groups, and an enquiry form. Anything sent
through that form lands in **Enquiries** in the portal and rings the bell.

**The staff portal** (`/catering`) is the working system:

| | |
|---|---|
| Quotations | The estimate, with its own numbering series (`ARC-…`) |
| Invoices | Billed after the event, copied from a quotation and then independent (`ARI-…`) |
| Templates | A saved set of lines. Applying one fills a new quotation |
| Event Ledger | Revenue less every vendor bill on the event |
| Customers, Vendors, Vendor Bills | Who is billed, and who gets paid |
| Menu & Rates, Categories | The rate card. A dish is priced per category |
| Rules, Settings | What prints on the slip, and the trading identity |
| Enquiries, Users | The website's leads, and who can sign in |

### Photography

The five website images live in `public/photos/` and are real catering
photographs (Unsplash, commercial use permitted). They are still stand-ins:
none of them is this kitchen's food.

`src/lib/site-photos.ts` documents the shot list, the ratio each slot expects
and who took each photograph. To swap in the client's own shoot, overwrite the
files in `public/photos/` under the same names — nothing else moves, because
every slot crops to fill.

---

## Two decisions worth knowing about

**There is no "meat supplied" band.** An earlier version of this system, built
for a different kitchen, itemised the raw meat for each dish on a second line
underneath it, with its own subtotal on the slip. This house quotes a dish at
one all-in rate, so that whole mechanism is gone: from the editor, from the
printed quotation and invoice, from the WhatsApp message, and from the schema.
Meat bought from a butcher is still a real cost and is still recorded — as a
**vendor bill** against the event, which is where it belongs.

**Nothing on the quotation form is derived from the menu after the pick.**
Choosing a dish fills its description, unit and rate once. From that moment
those fields belong to the operator: re-pricing the dish in Menu & Rates never
reaches back into a quotation that has already been given. And every keystroke
is mirrored into `sessionStorage`, so walking off to check or change a rate and
coming back returns to the form exactly as it was left. See the long comment on
`QuotationEditor` in `src/app/catering/quotations/quotation-editor.tsx`.

---

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server on 3000 |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `migrations/`. Refuses to rebuild a populated database without `--reset` |
| `npm run db:seed` | Truncate and reseed |
| `npm run db:reset` | Both, in order |
| `npm run icons` | Rebuild every logo and icon from `assets/mark-*.svg` |
| `npm run build:cpanel` | Production build packaged for the cPanel host |

## Schema

One file, `migrations/001_init.sql`, holding the final shape rather than a
replayed history. It is destructive by design and the migration runner refuses
to run it against a database that already has tables unless `--reset` is
passed, so `db:migrate` cannot wipe live data.
