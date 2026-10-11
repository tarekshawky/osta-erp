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

## CMS (stage 2: site settings, menus, social)

16. **One record for brand + contact (`SiteSettings`)** feeds header, footer, contact page, WhatsApp links, the booking forms and the homepage structured data (name, phone, email, `sameAs`). Fixes the old per-file copies (one `tel:` link was missing a digit).
17. **Menus are replaced atomically** on save (two levels, up to 40 items) so a half-saved menu can never reach the header. Links allow only paths, https, tel: and mailto:.
18. **Safe fallback.** If the site API is down, or an admin empties a menu, the public site uses its built-in header/footer, so navigation can never disappear.
19. **Language:** a visitor's own choice (cookie) wins; the admin's default language applies only to first-time visitors.
20. **Indexing switch** sets `noindex` on every page and makes `robots.txt` disallow all, for use while the site is being rebuilt.
21. **Social links** render as accessible text badges (no brand-icon dependency) and feed `sameAs` in the Organization data.
22. **Permissions:** contact/settings/social need `company.edit`; menus need `pages.edit`. All changes are audited.

## CMS (stage 3: media library)

23. **Storage in Postgres, no new service.** Uploads are converted to WebP at 480/960/1600/2400 px (never upscaled, EXIF stripped, orientation applied) and stored as `MediaVariant` rows; served from `/api/media/<id>?w=` with immutable caching and ETags. Chosen because no blob/S3 account exists yet. If the library grows large (thousands of images), move variants to object storage behind the same URL.
24. **WebP only for now.** AVIF would roughly double storage for a small saving; add it when storage moves off the database.
25. **Safe uploads:** the file's real bytes decide the format (JPG/PNG/WebP/GIF/AVIF); SVG and anything else is refused; 10 MB and 40-megapixel limits; sanitised names; admin session plus `media.manage` required.
26. **One image field everywhere.** The shared admin image field now picks from, or uploads into, the library. Old pasted URLs and inline images still display.
27. **Delete protection.** An image can't be deleted while it appears in a published page, site settings, or live blog/service/homepage/bookable-service content; the UI lists every place first. Draft-only use only warns. Unused images are flagged.
28. **Public pages use `srcset`** so phones download the 480/960 px version.

## CMS (stage 4: SEO)

29. **One analyzer, everywhere.** `analyzePage` is pure and unit-tested; the editor (live, on unsaved changes), the pages list and the SEO overview all run it. Score = 100 minus 20 per error, 8 per warning, 2 per tip. It is a guide, not a ranking promise.
30. **What counts as an error:** multiple H1s, broken internal links, invalid canonical. Everything else is a warning or tip. Publishing asks for confirmation when errors exist, rather than blocking, because a link may point to a page about to be published.
31. **Structured data is generated, never typed.** WebPage and BreadcrumbList always; FAQPage only when the page has an FAQ block; Service/Article by page type. It is validated before publishing, and **invalid structured data blocks publishing** (e.g. an FAQ item with an empty answer). The public API only serves data that validates, and the site escapes `<` so content can't break out of the script tag.
32. **H1 = the Hero heading.** Pages without a Hero are flagged, because that is the only block that renders an H1.
33. **JSON-LD is English.** Both languages share one URL (language is a visitor choice, not a path), so Arabic structured data can't be a separate document.
34. **No hreflang.** hreflang needs a distinct URL per language; this site serves both languages on one URL. Revisit only if language-specific URLs are introduced.
35. **Broken-link check covers internal links** (site paths, published services/blog/CMS pages, redirects). Outbound link checking is deferred (needs a scheduled job).
