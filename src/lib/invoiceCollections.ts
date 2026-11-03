import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma";

// A part-paid invoice keeps status "Unpaid" (it only becomes "Paid" once everything is received) but has paidAmount > 0.
// Every report that splits an invoice into money collected and money still owed uses these, so that for each invoice
// collected + still owed == amount and the Balance Sheet cannot drift out of balance.
export const PARTIAL_INVOICES = { status: "Unpaid", paidAmount: { gt: 0 } } as const;

// Money received on part-paid invoices, per payment method.
export async function partialCollectedByMethod(where: Prisma.InvoiceWhereInput = {}): Promise<{ payment: string; collected: number }[]> {
  const rows = await prisma.invoice.groupBy({ by: ["payment"], _sum: { paidAmount: true }, where: { ...where, ...PARTIAL_INVOICES } });
  return rows.map((r) => ({ payment: r.payment, collected: r._sum.paidAmount ?? 0 }));
}

export async function partialCollectedTotal(where: Prisma.InvoiceWhereInput = {}): Promise<number> {
  const a = await prisma.invoice.aggregate({ _sum: { paidAmount: true }, where: { ...where, ...PARTIAL_INVOICES } });
  return a._sum.paidAmount ?? 0;
}

// The status filter of the invoices list and its export. "Unpaid" means nothing received yet; "PartiallyPaid" is an invoice
// still open with part of the amount received; the other values are the stored statuses (Paid, Refunded, ...).
export function invoiceStatusFilter(status: string): Prisma.InvoiceWhereInput {
  if (status === "all" || !status) return {};
  if (status === "Unpaid") return { status: "Unpaid", paidAmount: 0 };
  if (status === "PartiallyPaid") return { ...PARTIAL_INVOICES };
  return { status };
}
