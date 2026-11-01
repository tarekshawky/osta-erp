import { prisma } from "@/lib/prisma";
import { DEFAULT_FACTORS, regionalPriceFils } from "./regional";

// Loads the Osta Services master price list (data/price-list.json) into Dynamic Pricing: every matched catalogue service becomes a
// PRICED service with a base starting price, a pricing unit and its price in every emirate (base x the emirate's price factor).
// Apartment painting and cleaning are priced by size, so they get options (Studio, 1 bedroom …). Services that are not in the
// list keep "price after inspection".

export type PriceEntry = { code: string; nameAr: string; serviceNameEn: string; groupEn: string | null; unitAr: string; unitLabelEn: string; pricingUnit: string; priceAed: number; plusParts: boolean };
export type OptionGroup = { code: string; serviceNameEn: string; groupEn: string | null; unitAr: string; options: { nameEn: string; nameAr: string; priceAed: number }[] };
export type PriceListData = { entries: PriceEntry[]; options: OptionGroup[] };

export type PriceListSummary = {
  dryRun: boolean; servicesPriced: number; priceRowsWritten: number; optionServices: number; factorsSet: number;
  notFound: string[]; conflicts: string[]; changedExisting: string[];
};

const key = (nameEn: string, groupEn: string | null) => `${nameEn.toLowerCase()}|${groupEn ?? ""}`;
const chunks = <T,>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
const PARTS_EN = "The starting price covers labour. The spare part is charged separately.";
const PARTS_AR = "السعر يشمل العمالة، وقطعة الغيار تُحسب بشكل منفصل.";

export async function applyPriceList(data: PriceListData, { dryRun = false }: { dryRun?: boolean } = {}): Promise<PriceListSummary> {
  const out: PriceListSummary = { dryRun, servicesPriced: 0, priceRowsWritten: 0, optionServices: 0, factorsSet: 0, notFound: [], conflicts: [], changedExisting: [] };

  // 1. the price level of each emirate
  const regions = await prisma.region.findMany({ select: { id: true, slug: true, priceFactor: true } });
  for (const r of regions) {
    const f = DEFAULT_FACTORS[r.slug];
    if (f !== undefined && f !== r.priceFactor) { out.factorsSet++; if (!dryRun) await prisma.region.update({ where: { id: r.id }, data: { priceFactor: f } }); }
  }
  const factor = new Map(regions.map((r) => [r.id, DEFAULT_FACTORS[r.slug] ?? r.priceFactor]));

  // 2. catalogue service -> bookable service
  const services = await prisma.catalogService.findMany({ select: { id: true, nameEn: true, groupEn: true, bookable: { select: { id: true, slug: true } } } });
  const bookableOf = new Map(services.map((s) => [key(s.nameEn, s.groupEn), s.bookable]));

  // 3. first listing of a service wins; a different price in a second section is reported
  const chosen = new Map<string, PriceEntry>();
  for (const e of [...data.entries].sort((a, b) => a.code.localeCompare(b.code))) {
    const k = key(e.serviceNameEn, e.groupEn);
    const had = chosen.get(k);
    if (had) { if (had.priceAed !== e.priceAed) out.conflicts.push(`${e.serviceNameEn}: ${had.priceAed} (section ${had.code}) vs ${e.priceAed} (section ${e.code}): used ${had.priceAed}`); continue; }
    chosen.set(k, e);
  }

  type Plan = { id: string; slug: string; e: PriceEntry };
  const plans: Plan[] = [];
  for (const [k, e] of chosen) {
    const b = bookableOf.get(k);
    if (!b) { out.notFound.push(e.serviceNameEn); continue; }
    plans.push({ id: b.id, slug: b.slug, e });
  }

  // 4. what is already priced by hand (reported when the list changes it)
  const existing = await prisma.servicePrice.findMany({ where: { serviceId: { in: plans.map((p) => p.id) }, active: true }, select: { serviceId: true, regionId: true, unitPriceFils: true, auto: true } });
  const before = new Map<string, Map<string, number>>();
  for (const r of existing) { const m = before.get(r.serviceId) ?? new Map(); m.set(r.regionId, r.unitPriceFils); before.set(r.serviceId, m); }

  const rows: { serviceId: string; regionId: string; unitPriceFils: number; active: boolean; auto: boolean }[] = [];
  for (const p of plans) {
    const base = p.e.priceAed * 100;
    for (const r of regions) {
      const price = regionalPriceFils(base, factor.get(r.id) ?? 1);
      rows.push({ serviceId: p.id, regionId: r.id, unitPriceFils: price, active: true, auto: true });
      const old = before.get(p.id)?.get(r.id);
      if (old !== undefined && old !== price) out.changedExisting.push(`${p.slug} ${r.slug}: ${old / 100} -> ${price / 100}`);
    }
  }
  out.servicesPriced = plans.length;
  out.priceRowsWritten = rows.length;

  // 5. option groups (apartment painting / cleaning by size)
  const optionPlans = data.options.flatMap((g) => { const b = bookableOf.get(key(g.serviceNameEn, g.groupEn)); if (!b) { out.notFound.push(g.serviceNameEn); return []; } return [{ g, b }]; });
  out.optionServices = optionPlans.length;
  if (dryRun) return out;

  // writes
  for (const part of chunks(plans, 40)) {
    await prisma.$transaction(part.map((p) => prisma.bookableService.update({
      where: { id: p.id },
      data: {
        priceMode: "PRICED", pricingUnit: p.e.pricingUnit, basePriceFils: p.e.priceAed * 100, unitLabelEn: p.e.unitLabelEn, unitLabelAr: p.e.unitAr,
        pricesIncludeVat: false, minQuantity: 1, ...(p.e.plusParts ? { noteEn: PARTS_EN, noteAr: PARTS_AR } : {}),
      },
    })));
  }
  for (const part of chunks(plans.map((p) => p.id), 100)) await prisma.servicePrice.deleteMany({ where: { serviceId: { in: part } } });
  for (const part of chunks(rows, 1000)) await prisma.servicePrice.createMany({ data: part });

  for (const { g, b } of optionPlans) {
    await prisma.serviceOption.deleteMany({ where: { serviceId: b.id } });
    await prisma.servicePrice.deleteMany({ where: { serviceId: b.id } });
    await prisma.bookableService.update({
      where: { id: b.id },
      data: { priceMode: "PRICED", pricingUnit: "FIXED", basePriceFils: null, unitLabelEn: "per apartment", unitLabelAr: "للشقة", pricesIncludeVat: false, minQuantity: 1, optionLabelEn: "Apartment size", optionLabelAr: "حجم الشقة" },
    });
    for (const [i, o] of g.options.entries()) {
      const created = await prisma.serviceOption.create({ data: { serviceId: b.id, nameEn: o.nameEn, nameAr: o.nameAr, sortOrder: i, active: true } });
      await prisma.serviceOptionPrice.createMany({ data: regions.map((r) => ({ optionId: created.id, regionId: r.id, unitPriceFils: regionalPriceFils(o.priceAed * 100, factor.get(r.id) ?? 1), active: true, auto: true })) });
    }
  }
  return out;
}

// After a price factor (or a base price) changed: recalculate every price that was calculated (auto), leave the ones typed by hand.
export async function recalculateRegionalPrices(): Promise<{ updated: number; created: number; keptManual: number }> {
  const [regions, services, rows] = await Promise.all([
    prisma.region.findMany({ select: { id: true, priceFactor: true } }),
    prisma.bookableService.findMany({ where: { priceMode: "PRICED", basePriceFils: { not: null }, options: { none: {} } }, select: { id: true, basePriceFils: true } }),
    prisma.servicePrice.findMany({ select: { id: true, serviceId: true, regionId: true, unitPriceFils: true, auto: true } }),
  ]);
  const byKey = new Map(rows.map((r) => [`${r.serviceId}|${r.regionId}`, r]));
  const updates: { id: string; unitPriceFils: number }[] = [];
  const creates: { serviceId: string; regionId: string; unitPriceFils: number; active: boolean; auto: boolean }[] = [];
  let keptManual = 0;
  for (const s of services) for (const r of regions) {
    const price = regionalPriceFils(s.basePriceFils!, r.priceFactor);
    const row = byKey.get(`${s.id}|${r.id}`);
    if (!row) creates.push({ serviceId: s.id, regionId: r.id, unitPriceFils: price, active: true, auto: true });
    else if (!row.auto) keptManual++;
    else if (row.unitPriceFils !== price) updates.push({ id: row.id, unitPriceFils: price });
  }
  for (const part of chunks(updates, 50)) await prisma.$transaction(part.map((u) => prisma.servicePrice.update({ where: { id: u.id }, data: { unitPriceFils: u.unitPriceFils } })));
  for (const part of chunks(creates, 1000)) await prisma.servicePrice.createMany({ data: part, skipDuplicates: true });
  return { updated: updates.length, created: creates.length, keptManual };
}
