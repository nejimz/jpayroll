# Payroll PH — Phase 1

Philippines payroll and timekeeping (Time In / Out) per [docs/PRD.md](docs/PRD.md).

**Phase 1 (this repo):** Auth/RBAC, employees, schedules, holidays, clock, timesheets, corrections, payroll periods, statutory contribution/tax tables, payroll runs, payslips (view + PDF), basic reports.

**Phase 2 (not built yet):** Leave, shifts, org structure, government filing exports, bank disbursement.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Auth.js (credentials)
- PostgreSQL + Prisma (driver adapter `@prisma/adapter-pg`)
- Money stored as **integer centavos**; labor days in **Asia/Manila**

## Setup

1. Start Postgres (Docker maps host **5433** → container 5432):

```bash
docker compose up -d
```

2. Copy env and install:

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo logins

Password for all: `password123`

| Email | Role |
| --- | --- |
| admin@demo.local | ADMIN |
| hr@demo.local | HR |
| finance@demo.local | FINANCE |
| staff@demo.local | EMPLOYEE |
| manager@demo.local | MANAGER |

## Smoke path

1. Sign in as `staff@demo.local` → **Clock** → Time In, later Time Out.
2. Sign in as `hr@demo.local` → **Periods** → create cut-off covering today → **Lock**.
3. **Run / recalculate payroll** → review register → **Finalize & publish payslips**.
4. Sign in as staff → **Payslips** → view / download PDF.

## Compliance disclaimer

Seeded SSS / PhilHealth / Pag-IBIG / BIR withholding tables are **illustrative**. Verify against current agency circulars before any production use. This software is not tax or legal advice.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run db:up` | Start Docker Postgres |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Reset demo master data |
| `npm run dev` | Dev server |
