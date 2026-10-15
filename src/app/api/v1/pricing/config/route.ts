import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

// Everything the booking app needs for a live *preview*. Prices are for display only;
// POST /orders re-prices on the server.
export async function GET() {
  const [regions, services, bookingTypes, tax, policy] = await Promise.all([
    prisma.region.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.bookableService.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        prices: { where: { active: true }, select: { regionId: true, unitPriceFils: true } },
        discountRuleSet: { include: { tiers: true } },
        addOns: {
          where: { active: true },
          include: { prices: { where: { active: true }, select: { regionId: true, priceFils: true } } },
        },
      },
    }),
    prisma.bookingType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { overrides: true } }),
    prisma.taxSetting.findUnique({ where: { id: "default" } }),
    prisma.visitFeePolicy.findFirst({ orderBy: { version: "desc" } }),
  ]);

  return apiSuccess({
    regions: regions.map((r) => ({ id: r.id, slug: r.slug, nameEn: r.nameEn, nameAr: r.nameAr })),
    services: services.map((s) => ({
      id: s.id,
      slug: s.slug,
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      descriptionEn: s.descriptionEn,
      descriptionAr: s.descriptionAr,
      imageUrl: s.imageUrl,
      pricingUnit: s.pricingUnit,
      minQuantity: s.minQuantity,
      pricesIncludeVat: s.pricesIncludeVat,
      noteEn: s.noteEn,
      noteAr: s.noteAr,
      prices: s.prices,
      tiers: s.discountRuleSet?.active
        ? s.discountRuleSet.tiers.map((t) => ({ minQty: t.minQty, maxQty: t.maxQty, percent: t.percent, startsAt: t.startsAt, endsAt: t.endsAt }))
        : [],
      addOns: s.addOns.map((a) => ({ id: a.id, nameEn: a.nameEn, nameAr: a.nameAr, prices: a.prices })),
    })),
    bookingTypes: bookingTypes.map((b) => ({
      id: b.id, code: b.code, nameEn: b.nameEn, nameAr: b.nameAr,
      descriptionEn: b.descriptionEn, descriptionAr: b.descriptionAr,
      defaultFeeFils: b.defaultFeeFils, sameDayAllowed: b.sameDayAllowed, hoursStart: b.hoursStart, hoursEnd: b.hoursEnd,
      overrides: b.overrides.map((o) => ({ serviceId: o.serviceId, regionId: o.regionId, feeFils: o.feeFils })),
    })),
    tax: { vatRatePercent: tax?.vatRatePercent ?? 5, pricesIncludeVat: tax?.pricesIncludeVat ?? true },
    visitFeePolicy: policy && {
      id: policy.id, version: policy.version, amountFils: policy.amountFils,
      textAr: policy.textAr, textEn: policy.textEn,
      consentLabelAr: policy.consentLabelAr, consentLabelEn: policy.consentLabelEn,
    },
  });
}
