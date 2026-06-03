# salon-pos

Point of sale for **Suraya Beauty Point Salon** — bilingual (EN/AR), OMR currency, multi-branch.

## Features

### Employee app

- **Sales** — guided flow: customer (name + optional phone) → category → service → price tier → discount → completion with a unique **sale code** (e.g. `S-000042`) per branch
- **Expenses** — record branch expenses with category and optional note
- **Attendance** — check in / check out; today’s worked time on the home screen
- **History** — browse past sales for the logged-in employee
- **Today summary** — sale count and revenue on the home screen
- **Auth** — PIN pad (default) or username/password; language toggle (EN / عربي)

### Admin app

- **Branches** — create and manage salon locations (EN/AR names)
- **Employees** — per-branch accounts (PIN or password, employee or admin role)
- **Services** — categories and services with multiple **price tiers** per service
- **Reports** — date-range presets and custom ranges in **Asia/Muscat** timezone; totals for sales, expenses, and attendance; drill-down lists with edit/delete for sales and expenses

## Stack

- **Bun** — package manager and runtime scripts
- **Biome** — lint and format (replaces ESLint + Prettier)
- **Next.js 16** (App Router, Turbopack dev) + **Tailwind CSS 4** + **shadcn/ui**
- **next-intl** — English + Arabic with RTL (`dir="rtl"` on Arabic)
- **Drizzle ORM** + **Neon Postgres**

## Getting started

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Set `DATABASE_URL` to your [Neon](https://neon.tech) connection string and `SESSION_SECRET` to a long random string.

3. Apply the database schema:

   ```bash
   bun install
   bun run db:migrate
   ```

4. Run the dev server:

   ```bash
   bun run dev
   ```

5. Open [http://localhost:3000/en](http://localhost:3000/en) or [http://localhost:3000/ar](http://localhost:3000/ar) for RTL preview.

6. Create an **admin** employee in the database (role `admin`, `auth_type` `password`) or use your deployment handoff notes, then sign in at `/en/admin/login`. Create staff accounts under **Admin → Employees**.

## Routes

| Role | Path | Purpose |
|------|------|---------|
| Public | `/{locale}/login` | Employee PIN / password login |
| Public | `/{locale}/admin/login` | Admin login |
| Employee | `/{locale}/home` | Dashboard, attendance, quick links |
| Employee | `/{locale}/sale` | New sale wizard |
| Employee | `/{locale}/sale/complete/[saleId]` | Sale confirmation + sale code |
| Employee | `/{locale}/expense` | Record expense |
| Employee | `/{locale}/history` | Sales history |
| Admin | `/{locale}/admin` | Admin dashboard |
| Admin | `/{locale}/admin/branches` | Branch CRUD |
| Admin | `/{locale}/admin/employees` | Employee CRUD |
| Admin | `/{locale}/admin/services` | Service catalog CRUD |
| Admin | `/{locale}/admin/reports` | Reports and transaction management |

`{locale}` is `en` or `ar`.

## Lint & format

[Biome](https://biomejs.dev) replaces ESLint and Prettier. TypeScript/JavaScript files and folders use **kebab-case** (`useFilenamingConvention`); Next.js reserved names (`page.tsx`, `layout.tsx`, `[locale]/`, etc.) are excluded via overrides.

```bash
bun run lint
bun run format
bun run typecheck
```

## Database

```bash
bun run db:generate   # generate migrations from schema
bun run db:push       # push schema to Neon (dev shortcut)
bun run db:migrate    # run SQL migrations (production)
```

Schema: [`src/lib/db/schema.ts`](src/lib/db/schema.ts)

Main tables: `branches`, `employees`, `service_categories`, `services`, `sales`, `sale_items`, `expenses`, `attendance_sessions`.

Migrations live in [`drizzle/`](drizzle/). Recent additions include per-sale `sale_code` and `attendance_sessions`.

## Service catalog (optional)

Offline scripts under [`scripts/`](scripts/) can build and import a JSON catalog into Postgres:

- `scripts/parse-flyer-pdf.ts` — draft catalog from a flyer PDF
- `scripts/generate-curated-catalog.ts` — generate curated `data/services-catalog.json`
- `scripts/import-services.ts` — idempotent import into `service_categories` + `services`

Requires `DATABASE_URL` in the environment. Catalog source file: `data/services-catalog.json` (not committed if absent).

## Deploy (Vercel + Neon)

Production: **https://salon-pos-opal.vercel.app**

Required Vercel environment variables: `DATABASE_URL`, `SESSION_SECRET`.

After linking a fresh database:

```bash
bun run db:migrate
```

Create the owner admin account in the database or via **Admin → Employees** after the first admin exists. Deploy:

```bash
bunx vercel deploy --prod
```

Deployment-specific credentials and owner steps may be documented in `OWNER-HANDOFF.md` (gitignored — do not commit).

## Project structure

```
src/
├── app/[locale]/(employee)/   # home, sale, expense, history
├── app/[locale]/(admin)/      # admin dashboard, branches, employees, services, reports
├── app/[locale]/login/        # employee login
├── app/[locale]/admin/login/  # admin login
├── app/api/auth/              # login, logout
├── components/
│   ├── admin/                 # managers, reports, edit drawers
│   ├── auth/                  # PIN pad, password form
│   └── employee/              # sale wizard, attendance, history
├── intl/                      # next-intl routing & navigation
└── lib/
    ├── admin/                 # reports, CRUD actions, date ranges
    ├── auth/                  # session, credentials
    ├── currency.ts            # formatOMR / parseOMR
    ├── db/                    # Drizzle + Neon
    ├── employee/              # sales, attendance, catalog queries
    └── sales/                 # sale validation
messages/en.json, ar.json
drizzle/                       # SQL migrations
scripts/                       # catalog import tooling
```

## Locales

| Locale | URL prefix | Direction |
|--------|------------|-----------|
| English | `/en` | LTR |
| Arabic | `/ar` | RTL |
