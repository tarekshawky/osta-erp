import { prisma } from "@/lib/prisma";
import { DiscountEditor } from "@/components/pricing/DiscountEditor";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function DiscountsPage() {
  const sets = await prisma.discountRuleSet.findMany({
    orderBy: { name: "asc" },
    include: { tiers: { orderBy: { minQty: "asc" } }, services: { select: { nameEn: true } } },
  });
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">Discount rules</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        One tier applies to the total quantity (never stacked). Booking fees and add-ons are never discounted. Attach a rule set to a service on the Prices tab.
      </p>
      <DiscountEditor
        ruleSets={sets.map((s) => ({
          id: s.id,
          name: s.name,
          active: s.active,
          startsAt: day(s.startsAt),
          endsAt: day(s.endsAt),
          services: s.services.map((x) => x.nameEn),
          tiers: s.tiers.map((t) => ({ minQty: String(t.minQty), maxQty: t.maxQty === null ? "" : String(t.maxQty), percent: String(t.percent) })),
        }))}
      />
    </div>
  );
}
