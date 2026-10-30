import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "./rules";

// "Add to booking": every Service Catalogue service becomes a bookable service with "price after inspection" (no price table
// needed), available in every active emirate. Services that already exist in Dynamic Pricing under another name are linked to
// their catalogue entry instead of being duplicated, so nothing is booked twice. Re-running only adds what is missing.

// Catalogue slug -> existing bookable service slug (the same service, named differently).
export const EXISTING_BOOKABLE: Record<string, string> = {
  "split-ac-cleaning": "ac-cleaning",
  "duct-ac-cleaning": "duct-cleaning",
  "r22-gas-refilling": "gas-refill",
  "r410a-gas-refilling": "gas-refill-410",
  "r32-gas-refilling": "gas-refill-32",
};

export type AddToBookingResult = { created: number; linked: number; switchedToInspection: number; alreadyHad: number };

const chunks = <T,>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

export async function addCatalogToBooking(): Promise<AddToBookingResult> {
  const [cats, services, bookable] = await Promise.all([
    prisma.catalogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true } }),
    prisma.catalogService.findMany({ include: { categories: { orderBy: { sortOrder: "asc" } }, bookable: { select: { id: true } } } }),
    prisma.bookableService.findMany({ select: { id: true, slug: true, catalogServiceId: true, _count: { select: { options: { where: { active: true } }, prices: { where: { active: true } } } } } }),
  ]);
  const order = new Map(cats.map((c, i) => [c.id, i]));
  const bySlug = new Map(bookable.map((b) => [b.slug, b]));
  const taken = new Set(bookable.map((b) => b.slug));
  const sorted = services
    .map((s) => ({ s, link: [...s.categories].sort((a, b) => (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0))[0] }))
    .filter((x) => x.link)
    .sort((a, b) => (order.get(a.link.categoryId) ?? 0) * 100000 + a.link.sortOrder - ((order.get(b.link.categoryId) ?? 0) * 100000 + b.link.sortOrder));

  let alreadyHad = 0;
  const toLink: { id: string; catalogServiceId: string; unpriced: boolean }[] = [];
  const fresh: { s: (typeof sorted)[number]["s"]; n: number }[] = [];
  sorted.forEach(({ s }, n) => {
    if (s.bookable) { alreadyHad++; return; }
    const existing = bySlug.get(EXISTING_BOOKABLE[s.slug] ?? "");
    if (existing && !existing.catalogServiceId) {
      existing.catalogServiceId = s.id; // never link one bookable service twice
      // An existing service with no price and no options in any emirate would show "not available": it becomes "price after inspection".
      toLink.push({ id: existing.id, catalogServiceId: s.id, unpriced: existing._count.prices === 0 && existing._count.options === 0 });
      return;
    }
    fresh.push({ s, n });
  });
  for (const l of toLink) await prisma.bookableService.update({ where: { id: l.id }, data: { catalogServiceId: l.catalogServiceId, ...(l.unpriced ? { priceMode: "INSPECTION", active: true } : {}) } });
  const linked = toLink.length;
  const switched = toLink.filter((l) => l.unpriced).length;

  const rows = fresh.map(({ s, n }) => ({
    slug: uniqueSlug(s.slug, taken, "service"),
    nameEn: s.nameEn, nameAr: s.nameAr,
    descriptionEn: s.shortDescriptionEn || null, descriptionAr: s.shortDescriptionAr || null, imageUrl: s.imageUrl || null,
    pricingUnit: "VISIT", priceMode: "INSPECTION", minQuantity: 1, active: true, sortOrder: 100 + n, catalogServiceId: s.id,
  }));
  for (const part of chunks(rows, 200)) await prisma.bookableService.createMany({ data: part });
  // Offered for booking now, so the catalogue marks them active too.
  await prisma.catalogService.updateMany({ where: { active: false }, data: { active: true } });
  return { created: rows.length, linked, switchedToInspection: switched, alreadyHad };
}
