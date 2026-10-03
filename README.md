# Voucher App

Next.js + Neon PostgreSQL payment voucher management app for personal/project use.

## Phase 1 + 2 additions
- Dashboard analytics with date-range summary, monthly expenditure, payment-mode distribution and expense-type analysis.
- Professional voucher reference display: `PV/YY-YY/0001`.
- Voucher register CSV and Excel-compatible `.xls` export.
- Column sorting, six-field voucher search and date/type/mode filters.
- Payee registry and per-payee payment history.
- Quick Create via **Save & New**; date/type/mode are retained for rapid entry.
- Duplicate-voucher warning with explicit **Save Anyway** option.
- Soft-delete/archive with restore instead of permanent deletion.
- PDF preview and download.

## Database
Run `scripts/phase-1-2.sql` in Neon after the existing schema. It is safe to run with `IF NOT EXISTS` guards.

## Environment
Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `SESSION_SECRET`.

## Run
```bash
npm install
npm run dev
```
