# Decisions

1. **Reuse `Order`** for pricing: add nullable snapshot columns instead of a second order table, so existing admin order screens keep working.
2. **Pure `priceQuote`** takes already-resolved config (unit price, tiers, fee, VAT). A separate resolver loads that from the DB. Keeps the engine identical on client preview and server.
3. **Percent math in basis points**, half-up, so no float error on money.
4. **Tier rules:** one tier on total quantity; quantity above the highest tier gets 0% unless an open-ended tier exists; overlaps/gaps rejected per date window.
5. **VAT inclusive** extracts tax for display and never increases the total; exclusive adds it.
6. **Vitest 3** (vitest 5 needs a newer `@types/node` than the repo has).
7. **Schema applied additively** with `prisma db push` (new tables / nullable columns only), matching how this repo already deploys schema.
