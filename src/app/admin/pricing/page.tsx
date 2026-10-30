import { prisma } from "@/lib/prisma";
import { filsToAed } from "@/lib/pricing/money";
import { PriceMatrix } from "@/components/pricing/PriceMatrix";
import { ServiceManager } from "@/components/pricing/ServiceManager";

export default async function PricingPage() {
  const [regions, services, ruleSets] = await Promise.all([
    prisma.region.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.bookableService.findMany({
      orderBy: { sortOrder: "asc" },
      include: { prices: { where: { active: true } }, options: { orderBy: { sortOrder: "asc" }, include: { prices: { where: { active: true } } } } },
    }),
    prisma.discountRuleSet.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-bold text-slate-900">Prices by emirate</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          A service can only be booked in an emirate where it has a price (services set to “Price after inspection” need none and are listed under Services below). Changing a price never affects existing orders.
        </p>
        <PriceMatrix
          regions={regions}
          services={services.filter((s) => s.priceMode !== "INSPECTION").map((s) => ({
            id: s.id,
            nameEn: s.nameEn,
            active: s.active,
            prices: Object.fromEntries(s.prices.map((p) => [p.regionId, filsToAed(p.unitPriceFils)])),
            options: s.options.map((o) => ({ id: o.id, nameEn: o.nameEn, active: o.active, prices: Object.fromEntries(o.prices.map((p) => [p.regionId, filsToAed(p.unitPriceFils)])) })),
          }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900">Services</h2>
        <ServiceManager
          ruleSets={ruleSets}
          services={services.map((s) => ({
            id: s.id,
            slug: s.slug,
            nameEn: s.nameEn,
            nameAr: s.nameAr,
            pricingUnit: s.pricingUnit,
            priceMode: s.priceMode === "INSPECTION" ? "INSPECTION" : "PRICED",
            minQuantity: String(s.minQuantity),
            active: s.active,
            discountRuleSetId: s.discountRuleSetId ?? "",
            pricesIncludeVat: s.pricesIncludeVat === null ? "" : s.pricesIncludeVat ? "true" : "false",
            noteEn: s.noteEn,
            noteAr: s.noteAr,
            optionLabelEn: s.optionLabelEn,
            optionLabelAr: s.optionLabelAr,
            options: s.options.map((o) => ({ id: o.id, nameEn: o.nameEn, nameAr: o.nameAr, active: o.active, noteEn: o.noteEn, noteAr: o.noteAr })),
          }))}
        />
      </section>
    </div>
  );
}
