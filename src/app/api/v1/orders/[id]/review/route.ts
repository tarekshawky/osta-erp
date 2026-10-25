import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";
import { isDone, reviewProblem } from "@/lib/orders/customerFlow";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The customer rates a finished job. One rating per order; it comes before payment.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;
  const { id } = await context.params;

  const body = await parseJsonBody<{ rating?: number; comment?: string }>(request);
  const problem = reviewProblem(body?.rating, body?.comment);
  if (problem) return apiError("invalid_request", problem, 400);

  // Ownership in the where clause: another customer's order looks like it does not exist.
  const order = await prisma.order.findFirst({ where: { id, customerId: customer.id }, select: { id: true, status: true, review: { select: { id: true } } } });
  if (!order) return apiError("not_found", "Order not found.", 404);
  if (!isDone(order.status)) return apiError("not_ready", "You can rate this job once it is done.", 409);
  if (order.review) return apiError("already_rated", "You have already rated this job.", 409);

  const review = await prisma.orderReview.create({
    data: { orderId: order.id, customerId: customer.id, rating: body!.rating!, comment: body?.comment?.trim() || null },
    select: { rating: true, comment: true, createdAt: true },
  });
  return apiSuccess(review);
}
