# Decisions

1. **Reuse `Order`** for pricing: add nullable snapshot columns instead of a second order table, so existing admin order screens keep working.
2. **Pure `priceQuote`** takes already-resolved config (unit price, tiers, fee, VAT). A separate resolver loads that from the DB. Keeps the engine identical on client preview and server.
3. **Percent math in basis points**, half-up, so no float error on money.
4. **Tier rules:** one tier on total quantity; quantity above the highest tier gets 0% unless an open-ended tier exists; overlaps/gaps rejected per date window.
5. **VAT inclusive** extracts tax for display and never increases the total; exclusive adds it.
6. **Vitest 3** (vitest 5 needs a newer `@types/node` than the repo has).
7. **Schema applied additively** with `prisma db push` (new tables / nullable columns only), matching how this repo already deploys schema.

## CMS (stage 1: pages, versions, blocks)

8. **Bilingual inside the page.** Every text prop is `{en, ar}`, so one page serves both locales (matches HomeSection/BlogPost). `translationGroupId` is reserved if locales are ever split into separate pages.
9. **Draft vs published are physically separate.** The editor writes `draftBlocks`/`draftSeo` on `CmsPage`; the live site reads only the published `CmsPageVersion` snapshot. Editing never changes what visitors see until Publish.
10. **Versions:** a snapshot is created on manual Save, Publish, Schedule and Restore. Autosave (3s after the last edit) updates the draft only, so history is not flooded.
11. **Slug changes apply on publish.** The public lookup uses the published snapshot's slug; changing it creates a 301 redirect from the old URL automatically. A publish is refused if another published page already owns the URL.
12. **Reserved slugs.** Slugs of real routes (about, blog, services, login, ...) can't be used by CMS pages. Existing hard-coded pages stay as they are until migrated.
13. **Scheduling works without cron.** Due pages are promoted the next time the public API is read; `/api/cron/publish-scheduled` (Bearer `CRON_SECRET`) is optional for promptness.
14. **Blocks are validated server-side** with Zod on save, publish and again before serving. Links allow only paths, https, tel:, mailto:; images allow only paths, https or raster data URLs (no SVG). The Custom HTML block is deferred until a sanitizer is added.
15. **Preview** uses a 15-minute HMAC token tied to one page; draft content is never served without it.

### Env vars (CMS)
- Admin app: `SITE_URL` (public site origin, for previews and cache refresh), `REVALIDATE_SECRET`, optional `CRON_SECRET`.
- Public app: `REVALIDATE_SECRET` (same value).
