import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, apiError } from "@/lib/apiResponse";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;
  const { id } = await context.params;

  // Ownership is enforced in the where clause itself, never checked after the fact --
  // an order that exists but belongs to another customer must look identical to one
  // that doesn't exist at all (404, not 403).
  const order = await prisma.order.findFirst({
    where: { id, customerId: customer.id },
    select: {
      id: true,
      number: true,
      date: true,
      scheduledAt: true,
      locationUrl: true,
      orderType: true,
      priceAgreed: true,
      customerLanguage: true,
      notes: true,
      status: true,
      team: { select: { name: true } },
      assignedTo: { select: { name: true } },
      invoiceId: true,
      invoice: { select: { number: true, amount: true, status: true } },
      acceptedAt: true,
      departedAt: true,
      etaMinutes: true,
      arrivedAt: true,
      workStartedAt: true,
      doneAt: true,
      cancelledAt: true,
      cancellationReason: true,
      rescheduledAt: true,
      rescheduleReason: true,
      createdAt: true,
    },
  });

  if (!order) return apiError("not_found", "Order not found.", 404);
  return apiSuccess(order);
}
