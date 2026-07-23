# OSTA ERP

A Next.js 16 ERP app for OSTA Services — role-based login (Employee / Admin), invoices with a 4-step creation wizard and PDF export, expenses, employee management, and wallets/custody tracking.

## Stack

- Next.js 16 (App Router, Turbopack)
- Prisma + PostgreSQL (Neon)
- Tailwind CSS v4

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your `.env`:

   ```
   DATABASE_URL="postgresql://..."
   AUTH_SECRET="a-long-random-string"
   ```

3. Push the schema and seed demo data:

   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Demo logins

- Employee PIN: `1991` (Mostafa Yasser Ahmed Ali, Team Leader)
- Admin PIN: `1000` (Amr Abdelhamid, CEO & Co-Founder)
