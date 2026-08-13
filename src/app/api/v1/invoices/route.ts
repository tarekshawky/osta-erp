import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, parsePagination, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

const invoiceSelect = {
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
  createdAt: true,
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;

  const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
  const where = { customerId: customer.id };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where, select: invoiceSelect, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.invoice.count({ where }),
  ]);

  return apiSuccess(invoices, { meta: { page, pageSize, total } });
}
