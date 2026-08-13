import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, apiError } from "@/lib/apiResponse";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;
  const { id } = await context.params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, customerId: customer.id },
    select: {
      id: true,
      number: true,
      date: true,
      serviceType: true,
      category: true,
      payment: true,
      amount: true,
      status: true,
      refundedAmount: true,
      warrantyUntil: true,
      items: { select: { serviceName: true, description: true, qty: true, unitPrice: true } },
      createdAt: true,
    },
  });

  if (!invoice) return apiError("not_found", "Invoice not found.", 404);
  return apiSuccess(invoice);
}
