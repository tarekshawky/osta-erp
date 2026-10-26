"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { visitFeeEligibility } from "@/lib/pricing/visitFee";
import { ORDER_EVENT_TYPES } from "@/lib/orderEvents";

export type ActionResult = { ok: boolean; error?: string };

export async function addOrderEvent(orderId: string, type: string, note: string): Promise<ActionResult> {
  const g = await guardPermission("orders.manage");
  if (!g.ok) return { ok: false, error: g.error };
  const admin = g.admin;
  if (!(ORDER_EVENT_TYPES as readonly string[]).includes(type)) return { ok: false, error: "Unknown event type." };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { events: true } });
  if (!order) return { ok: false, error: "Order not found." };
  if (type === "DISPATCHED" && order.events.some((e) => e.type === "DISPATCHED")) {
    return { ok: false, error: "The team was already marked as dispatched." };
  }

  await prisma.orderEvent.create({ data: { orderId, type, note: note.trim() || null, actorId: admin.id } });
  await writeAudit(admin, "order.event", "Order", orderId, null, { type, note: note.trim() || null });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function raiseVisitFeeCharge(orderId: string, reason: string, evidence: string): Promise<ActionResult> {
  const g = await guardPermission("orders.manage");
  if (!g.ok) return { ok: false, error: g.error };
  const admin = g.admin;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { events: true, visitFeePolicy: true, visitFeeCharges: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  const problem = visitFeeEligibility({
    hasAcceptedPolicy: !!order.visitFeePolicy && !!order.consentAcceptedAt,
    eventTypes: order.events.map((e) => e.type),
    policyReasons: order.visitFeePolicy?.reasons ?? [],
    reason,
    chargeStatuses: order.visitFeeCharges.map((c) => c.status),
  });
  if (problem || !order.visitFeePolicy) return { ok: false, error: problem ?? "No policy." };
  if (!evidence.trim()) return { ok: false, error: "Add evidence (notes, call log, photos reference) for the reviewer." };

  await prisma.visitFeeCharge.create({
    data: {
      orderId,
      policyId: order.visitFeePolicy.id,
      reason,
      evidence: evidence.trim(),
      // Policies that do not require review are approved immediately, with the raiser recorded.
      ...(order.visitFeePolicy.requiresAdminReview
        ? {}
        : { status: "APPROVED", reviewedById: admin.id, reviewedAt: new Date(), reviewNote: "Auto-approved: policy needs no review" }),
    },
  });
  await prisma.orderEvent.create({ data: { orderId, type: "VISIT_FEE_RAISED", note: reason, actorId: admin.id } });
  await writeAudit(admin, "order.visitFee.raise", "Order", orderId, null, { reason });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/pricing/visit-fees");
  return { ok: true };
}
