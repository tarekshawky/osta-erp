# Changelog

## Website CMS + Dynamic Pricing (this release)

### Dynamic pricing & booking
- Pricing engine in integer fils: per-emirate prices, one discount tier on total quantity, booking fees, add-ons, VAT inclusive/exclusive; the server re-prices every booking and ignores client totals.
- Admin: Prices & Services matrix, Discounts (with live preview), Booking Types and overrides, Tax & Visit Fee (versioned policy), Visit Fee Review.
- Customer booking stepper (7 steps, English/Arabic, RTL) with a live price breakdown, visit-fee notice and required consent; falls back to the original request form until prices exist.
- Orders keep an immutable price snapshot, a timeline, and a visit-fee flow enforced on the server (after dispatch only, never for company-side cancellation/no-show).

### Platform
- Six permission roles enforced on the server; Audit Log; content export/import.

### Website CMS
- Block-based pages with drafts, versions/restore, scheduling, preview, per-device visibility, drag and drop.
- Editable homepage (draft until published; unpublish returns to the built-in one).
- Site settings (single source for contact details), menus, social links, media library (WebP, usage tracking, delete protection).
- SEO: score, Google preview, duplicate/broken-link checks, validated structured data, answer-engine checklist, redirects, sitemap preview.
- Local SEO: service areas, area pages with a near-duplicate publish guard and LocalBusiness data.
- Forms & leads with bot protection and CSV export; integrations with consent-gated analytics; backlink tracking with an SSRF-hardened checker.

### Fixes along the way
- Customer language choice no longer flashes back to English on reload.
- Invoice printing no longer prints the dark mobile screen.
- Invoices created with a payment link start Unpaid instead of auto-Paid.
- Blog cover images now display; blog search added.
- Contact page call link was missing a digit.
- Unpublished CMS pages could stay online indefinitely on the public site (cache behaviour); fixed.
- A page marked "hide from search engines" could still appear in the sitemap; fixed.

### Known limits
- Images are stored in the database (fine for hundreds; move to object storage if the library grows large).
- Forms use a honeypot, timing and rate limit, not a CAPTCHA.
- No hreflang (both languages share one URL). Google consent-mode v2 and server-side Meta tracking are not implemented.
- Search Console backlink import and outbound link scheduling are not implemented.
