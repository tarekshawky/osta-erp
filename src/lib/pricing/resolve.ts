import { prisma } from "@/lib/prisma";
import { priceQuote, type DiscountTier, type Quote } from "./priceQuote";
import { chooseUnitPrice } from "./options";

export type QuoteRequest = {
  regionId: string;
  serviceId: string;
  quantity: number;
  bookingTypeId: string;
  addOnIds?: string[];
  // Required when the service has options (e.g. a gas weight).
  optionId?: string;
  at?: Date;
};

export type ResolvedQuote = { quote: Quote; policyId: string; ruleSetId: string | null; option: { id: string; nameEn: string; nameAr: string } | null };

// Loads every price input from the DB and runs the shared pure engine. This is the only
// place a price is produced for an order -- client totals are never read.
export async function resolveQuote(req: QuoteRequest): Promise<ResolvedQuote> {
  const at = req.at ?? new Date();
  const [service, price, options, bookingType, tax, policy] = await Promise.all([
    prisma.bookableService.findFirst({
      where: { id: req.serviceId, active: true },
      include: { discountRuleSet: { include: { tiers: true } } },
    }),
    prisma.servicePrice.findFirst({
      where: { serviceId: req.serviceId, regionId: req.regionId, active: true, region: { active: true } },
    }),
    prisma.serviceOption.findMany({
      where: { serviceId: req.serviceId, active: true },
      include: { prices: { where: { regionId: req.regionId, active: true, region: { active: true } } } },
    }),
    prisma.bookingType.findFirst({ where: { id: req.bookingTypeId, active: true } }),
    prisma.taxSetting.findUnique({ where: { id: "default" } }),
    prisma.visitFeePolicy.findFirst({ orderBy: { version: "desc" } }),
  ]);
  if (!service) throw new Error("service_not_found");
  if (!bookingType) throw new Error("booking_type_not_found");
  if (!policy) throw new Error("visit_fee_policy_missing");

  const override = await prisma.bookingTypeFeeOverride.findFirst({
    where: {
      bookingTypeId: bookingType.id,
      OR: [
        { serviceId: service.id, regionId: req.regionId },
        { serviceId: service.id, regionId: null },
        { serviceId: null, regionId: req.regionId },
      ],
    },
    orderBy: [{ serviceId: { sort: "desc", nulls: "last" } }, { regionId: { sort: "desc", nulls: "last" } }],
  });

  const addOnRows = req.addOnIds?.length
    ? await prisma.addOnPrice.findMany({
        where: { addOnId: { in: req.addOnIds }, regionId: req.regionId, active: true, addOn: { serviceId: service.id, active: true } },
      })
    : [];
  if (addOnRows.length !== (req.addOnIds?.length ?? 0)) throw new Error("add_on_unavailable");

  const rs = service.discountRuleSet;
  const ruleActive = rs && rs.active && (!rs.startsAt || at >= rs.startsAt) && (!rs.endsAt || at <= rs.endsAt);
  const tiers: DiscountTier[] = ruleActive
    ? rs.tiers.map((t) => ({ minQty: t.minQty, maxQty: t.maxQty, percent: t.percent, startsAt: t.startsAt, endsAt: t.endsAt }))
    : [];

  const unit = chooseUnitPrice({
    basePriceFils: price?.unitPriceFils ?? null,
    options: options.map((o) => ({ id: o.id, priceFils: o.prices[0]?.unitPriceFils ?? null })),
    optionId: req.optionId,
  });
  const chosen = options.find((o) => o.id === unit.optionId) ?? null;

  const quote = priceQuote({
    unitPriceFils: unit.unitPriceFils,
    quantity: req.quantity,
    minQuantity: service.minQuantity,
    tiers,
    bookingFeeFils: override?.feeFils ?? bookingType.defaultFeeFils,
    addOns: addOnRows.map((a) => ({ id: a.addOnId, priceFils: a.priceFils })),
    vat: {
      ratePercent: tax?.vatRatePercent ?? 5,
      pricesIncludeVat: service.pricesIncludeVat ?? tax?.pricesIncludeVat ?? true,
    },
    at,
  });
  return { quote, policyId: policy.id, ruleSetId: rs?.id ?? null, option: chosen ? { id: chosen.id, nameEn: chosen.nameEn, nameAr: chosen.nameAr } : null };
}
