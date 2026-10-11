import { prisma } from "@/lib/prisma";
import { filsToAed } from "@/lib/pricing/money";
import { ChargeReview } from "@/components/pricing/ChargeReview";

export default async function VisitFeesPage() {
  const charges = await prisma.visitFeeCharge.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: { order: { select: { number: true } }, policy: { select: { amountFils: true } } },
  });
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">Visit fee review</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        A visit fee is never added when an order is created. It can only be raised after the team is dispatched, and is blocked when the company cancels or the team does not show up.
      </p>
      <ChargeReview
        charges={charges.map((c) => ({
          id: c.id,
          orderNumber: c.order.number,
          reason: c.reason,
          evidence: c.evidence ?? "",
          amountAed: filsToAed(c.policy.amountFils),
          createdAt: c.createdAt.toISOString().slice(0, 10),
        }))}
      />
    </div>
  );
}
