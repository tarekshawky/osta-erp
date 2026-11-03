import { prisma } from "@/lib/prisma";
import { regionalPriceFils } from "@/lib/pricing/regional";
import type { AssistantData, AssistantService, PriceInfo } from "./answer";

// Reads what the assistant answers from: the bookable services of the Service Catalogue with their prices per emirate, the emirates,
// the categories and the contact details. Kept for 5 minutes (a question never waits for ~700 services to load).

async function load(): Promise<AssistantData> {
  // flat queries, all at once: nested ones would wait for each other (~700 services, ~6,000 prices)
  const [services, prices, optionPrices, links, regions, categories, settings] = await Promise.all([
    prisma.bookableService.findMany({
      where: { active: true, catalogServiceId: { not: null }, catalogService: { active: true } },
      select: { id: true, slug: true, nameEn: true, nameAr: true, priceMode: true, basePriceFils: true, unitLabelEn: true, unitLabelAr: true, catalogServiceId: true },
    }),
    prisma.servicePrice.findMany({ where: { active: true }, select: { serviceId: true, regionId: true, unitPriceFils: true } }),
    prisma.serviceOptionPrice.findMany({ where: { active: true, option: { active: true } }, select: { regionId: true, unitPriceFils: true, option: { select: { serviceId: true } } } }),
    prisma.catalogCategoryService.findMany({ select: { serviceId: true, category: { select: { nameEn: true, nameAr: true, sortOrder: true, active: true } } } }),
    prisma.region.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, nameEn: true, nameAr: true, priceFactor: true } }),
    prisma.catalogCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { nameEn: true, nameAr: true } }),
    prisma.siteSettings.findFirst({ select: { phone: true, whatsapp: true, email: true, hoursEn: true, hoursAr: true, addressEn: true, addressAr: true } }),
  ]);

  const own = new Map<string, number>(); // serviceId|regionId -> fils
  for (const p of prices) own.set(`${p.serviceId}|${p.regionId}`, p.unitPriceFils);
  const optionFrom = new Map<string, number>(); // serviceId|regionId -> the lowest option price
  for (const p of optionPrices) { const k = `${p.option.serviceId}|${p.regionId}`; optionFrom.set(k, Math.min(optionFrom.get(k) ?? Infinity, p.unitPriceFils)); }
  const hasOptions = new Set(optionPrices.map((p) => p.option.serviceId));
  const firstCategory = new Map<string, { nameEn: string; nameAr: string }>();
  for (const l of [...links].sort((a, b) => a.category.sortOrder - b.category.sortOrder)) if (l.category.active && !firstCategory.has(l.serviceId)) firstCategory.set(l.serviceId, l.category);

  const out: AssistantService[] = [];
  for (const s of services) {
    const cat = firstCategory.get(s.catalogServiceId!);
    if (!cat) continue;
    const byRegion: Record<string, number> = {};
    if (s.priceMode !== "INSPECTION") {
      for (const r of regions) {
        const fils = hasOptions.has(s.id) ? optionFrom.get(`${s.id}|${r.id}`) : own.get(`${s.id}|${r.id}`) ?? (s.basePriceFils !== null ? regionalPriceFils(s.basePriceFils, r.priceFactor) : undefined);
        if (fils !== undefined) byRegion[r.slug] = fils / 100;
      }
    }
    const price: PriceInfo = s.priceMode === "INSPECTION" ? { mode: "INSPECTION" } : { mode: "PRICED", unitEn: s.unitLabelEn, unitAr: s.unitLabelAr, byRegion };
    out.push({ slug: s.slug, nameEn: s.nameEn, nameAr: s.nameAr, category: cat.nameEn, categoryAr: cat.nameAr, price });
  }
  out.sort((a, b) => a.category.localeCompare(b.category) || a.nameEn.localeCompare(b.nameEn) || a.slug.localeCompare(b.slug));

  return {
    services: out,
    regions: regions.map((r) => ({ slug: r.slug, nameEn: r.nameEn, nameAr: r.nameAr })),
    categories,
    contact: { phone: settings?.phone ?? "", whatsapp: settings?.whatsapp ?? "", email: settings?.email ?? "", hoursEn: settings?.hoursEn ?? "", hoursAr: settings?.hoursAr ?? "", addressEn: settings?.addressEn ?? "", addressAr: settings?.addressAr ?? "" },
  };
}

let cached: { at: number; value: Promise<AssistantData> } | null = null;
export function assistantData(): Promise<AssistantData> {
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.value;
  const value = load();
  cached = { at: Date.now(), value };
  value.catch(() => { if (cached?.value === value) cached = null; }); // a failed load is not kept
  return value;
}
