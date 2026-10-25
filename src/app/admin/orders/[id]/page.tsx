import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { OrderDetail } from "@/components/order/OrderDetail";
import { OrderPricingPanel, type PricingLine } from "@/components/order/OrderPricingPanel";
import { filsToAed } from "@/lib/pricing/money";
import type { Quote } from "@/lib/pricing/priceQuote";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      team: true,
      assignedTo: true,
      createdBy: true,
      invoice: true,
      photos: true,
      doneBy: true,
      cancelledBy: true,
      rescheduledBy: true,
      statusChanges: { orderBy: { createdAt: "desc" }, include: { changedBy: true } },
      region: true,
      bookableService: true,
      bookingType: true,
      visitFeePolicy: true,
      review: true,
      events: { orderBy: { createdAt: "asc" } },
      visitFeeCharges: { orderBy: { createdAt: "asc" }, include: { policy: true } },
    },
  });
  if (!order) notFound();

  const actorIds = [...new Set(order.events.map((e) => e.actorId).filter((x): x is string => !!x))];
  const actors = actorIds.length ? await prisma.employee.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  const q = order.pricingSnapshot as unknown as Quote | null;
  const option = (order.pricingSnapshot as { option?: { nameEn?: string } | null } | null)?.option?.nameEn;
  const aed = (f: number) => `${filsToAed(f)} AED`;
  const lines: PricingLine[] = q
    ? [
        { label: "Unit price", value: aed(q.unitPriceFils) },
        { label: "Subtotal", value: aed(q.subtotalFils) },
        ...(q.discountFils > 0 ? [{ label: `Discount (${q.discountPercent}%)`, value: `− ${aed(q.discountFils)}` }] : []),
        { label: "After discount", value: aed(q.serviceNetFils) },
        { label: "Booking fee", value: aed(q.bookingFeeFils) },
        ...(q.addOnsFils > 0 ? [{ label: "Add-ons", value: aed(q.addOnsFils) }] : []),
        { label: q.pricesIncludeVat ? `VAT included (${q.vatRatePercent}%)` : `VAT (${q.vatRatePercent}%)`, value: aed(q.vatFils) },
        { label: "Total", value: aed(q.totalFils), strong: true },
      ]
    : [];
  const stamp = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="pb-10">
      <AdminTopBar title="Order Details" />
      <div className="px-5 py-4 max-w-xl">
        <OrderDetail order={order} basePath="/admin" />
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Customer rating</h3>
          {order.review ? (
            <>
              <p className="mt-1 text-lg tracking-wider text-amber-500" aria-label={`${order.review.rating} out of 5 stars`}>{"★".repeat(order.review.rating)}<span className="text-slate-300">{"★".repeat(5 - order.review.rating)}</span></p>
              {order.review.comment && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{order.review.comment}</p>}
              <p className="mt-1 text-xs text-slate-400">{stamp(order.review.createdAt)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">{order.status === "Done" ? "Not rated yet. The customer is asked to rate before paying." : "Asked once the job is done."}</p>
          )}
        </div>
        <OrderPricingPanel
          orderId={order.id}
          summary={q && order.bookableService && order.region && order.bookingType ? `${order.bookableService.nameEn}${option ? ` — ${option}` : ""} × ${order.quantity} · ${order.region.nameEn} · ${order.bookingType.nameEn}` : null}
          lines={lines}
          consentAt={order.consentAcceptedAt ? stamp(order.consentAcceptedAt) : null}
          policyVersion={order.visitFeePolicy?.version ?? null}
          events={order.events.map((e) => ({ id: e.id, type: e.type, note: e.note ?? "", actor: (e.actorId && actorName.get(e.actorId)) || "", at: stamp(e.createdAt) }))}
          charges={order.visitFeeCharges.map((c) => ({ id: c.id, status: c.status, reason: c.reason, amountAed: filsToAed(c.policy.amountFils), evidence: c.evidence ?? "" }))}
          policyReasons={order.visitFeePolicy?.reasons ?? []}
          canRaiseFee={!!order.consentAcceptedAt}
          dispatched={order.events.some((e) => e.type === "DISPATCHED")}
        />
      </div>
    </div>
  );
}
