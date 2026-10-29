# Jobs & Workforce module

Public job pages, WhatsApp sharing, application form with work photos, admin review, workers database.

## Where things are

| What | Address |
|---|---|
| Public list / job page | On the customer website: `/join-osta-team/jobs`, `/join-osta-team/jobs/[slug]` (the website calls the ERP; the ERP also answers on the same paths and on `/jobs`). Env `PUBLIC_JOBS_PATH` changes the path. |
| Admin | `/admin/jobs` (Overview, All Jobs, Create, Applications, Workers, Reports, Settings) |
| Private photos (admins only) | `/api/admin/jobs/photos/[id]` |
| Public APIs | `GET /api/v1/jobs` (open jobs), `GET /api/v1/jobs/[slug]` (one job + form settings), `POST /api/jobs/uploads` (one photo), `POST /api/jobs/apply`; all CORS-enabled for the website |
| Cron | `GET /api/cron/jobs-reminders` (daily, `vercel.json`) |
| Sitemap | The website's `/sitemap.xml` lists the jobs list and open jobs (the dashboard has no sitemap) |

Everything is protected by the `jobs.manage` permission (owners and admins have it; a role can be narrowed in Employees). The
public pages and the two public APIs are open; the admin pages, the photo route and the CSV exports check the permission on the
server. Employee-PIN users have no access.

## Environment variables

| Variable | Example | Purpose |
|---|---|---|
| `PUBLIC_JOBS_BASE_URL` | `https://osta-invoices.vercel.app` (today), `https://www.ostaservices.com` (later) | The ONE place every absolute URL comes from: share links, WhatsApp text, canonical, Open Graph, emails. Falls back to `SITE_URL` (the customer website) and then the Vercel URL. |
| `LEGACY_JOBS_DOMAIN` | `osta-invoices.vercel.app` | Optional. While set (together with `PUBLIC_JOBS_BASE_URL` pointing at the NEW domain), `/jobs/*` on the old host is redirected (301) to the new one. Leave empty until the move. Read at build time: redeploy after changing it. |
| `CRON_SECRET` | a long random string | Secures `/api/cron/jobs-reminders`. Vercel Cron sends it automatically as `Authorization: Bearer …`. |
| `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL` | (already used by forms) | Email notifications for new applications (Settings → Notifications). Without them emails are only logged. |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | from Cloudflare | Optional captcha on the application form. Off when not set (honeypot, timing check and rate limits still apply). |

If `PUBLIC_JOBS_BASE_URL` is not set the module uses `SITE_URL` (the customer website), then the Vercel URL of the deployment. Set `PUBLIC_JOBS_BASE_URL=https://osta-invoice-users.vercel.app` to be explicit.

## Moving to the final domain (`ostaservices.com`)

1. Add the domain in Vercel and point DNS (when you are ready; nothing is needed now).
2. Set `PUBLIC_JOBS_BASE_URL=https://www.ostaservices.com`.
3. (Optional) Set `LEGACY_JOBS_DOMAIN=<the old host>` so old shared links `/jobs/...` 301-redirect to the new domain.
4. Redeploy. No code change. Slugs never change, so links already shared on WhatsApp keep working.

## Storage of photos

The project has no object storage; like the media library, photos live in the database (Postgres). Only a private key is stored
(`storageKey`), the bytes are in `JobPhotoData` (never read by list queries) and are served only through the authenticated admin
route. Photos are re-encoded to WebP at most 2000 px (this removes EXIF/GPS) with a 320 px thumbnail. To move to S3/Vercel Blob later,
change `JobPhotoData` and the two places that read/write it (`submitApplication`, the photo route).

Vercel limits one request body to 4.5 MB, so the form uploads photos **one at a time** (resized in the browser to 2000 px first) and
sends only short-lived tokens with the final submission. Photos uploaded but never submitted are deleted by the daily cron.

## Data model

New tables only (additive, applied with `prisma db push`): `JobCategory`, `JobCategoryField`, `Job`, `JobStatusHistory`,
`JobApplicant`, `JobApplication`, `JobApplicationPhoto`, `JobPhotoData`, `JobUploadTemp`, `JobApplicationNote`, `JobContactLog`,
`JobNotification`, `JobSettings`, plus enums `JobType`, `JobStatus`, `JobApplicationStatus`, `JobEmirate`, `JobPropertyType`,
`JobMaterialsBy`. Seed: open `/admin/jobs` once (default categories, the painting “Paint Finish” field, skills) or call
`seedJobDefaults()`.

## Tests

`npm test` runs the unit tests (schemas, slug, phone numbers, Arabic counts, status rules, ad text, photo checks, upload tokens).
`src/lib/jobs/jobs.e2e.test.ts` is an integration test against a running server and the real database; it is skipped unless
`JOBS_E2E=1` (with `E2E_IMG` = a folder of test images and `E2E_BASE` = the server address) and removes the data it creates.
