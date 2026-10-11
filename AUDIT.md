# Audit (OSTA CMS + Dynamic Pricing)

- **Apps:** `osta-erp` (admin + DB + `/api/v1`) and `osta-bookig-users` (customer site, auth + booking only, no DB).
- **Stack:** Next.js 16 App Router, TypeScript strict, Prisma 6 + Neon Postgres (shared production DB, schema applied with `prisma db push`, no migrations folder), Tailwind v4.
- **Auth:** customers = email + password, scrypt hash, JWT via `jose` (`requireCustomer`); admin/employees = PIN session (`requireEmployee`). No Clerk.
- **Existing content models:** `BlogPost`, `ServicePage`, `HomeSection`/`HomeSectionItem` (+ admin CRUD, public `/api/v1/*`).
- **Existing `Order`:** a job order (status, team, assignment). Customer bookings arrive as status `Requested`. Reused, not duplicated.
- **Gaps found:** no test runner, no zod, no pricing tables, no RBAC beyond ADMIN/EMPLOYEE roles, no audit log table.
