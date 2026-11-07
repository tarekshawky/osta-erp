import { prisma } from "./prisma";
import { collectedOf } from "./invoicePayment";
import { purchaseMargin, type PurchaseMargin } from "./expenseClasses";

// What a purchase cost against what the customer was charged for parts on the same order's invoice, and how much of that they
// have paid. Parts billed = the invoice's spare-part lines; the invoice's collected share is applied to them.
export async function marginFor(orderId: string | null, cost: number): Promise<(PurchaseMargin & { invoiceNumber: string; invoiceStatus: string }) | null> {
  if (!orderId) return null;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { invoice: { select: { number: true, amount: true, refundedAmount: true, status: true, paidAmount: true, items: { select: { itemType: true, qty: true, unitPrice: true } } } } },
  });
  const inv = order?.invoice;
  if (!inv) return null;
  const parts = inv.items.filter((i) => i.itemType === "SparePart").reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return { ...purchaseMargin(cost, parts, inv.amount - inv.refundedAmount, collectedOf(inv)), invoiceNumber: inv.number, invoiceStatus: inv.status };
}

export const PURCHASE_STATUS_STYLE: Record<string, string> = {
  Approved: "bg-green-50 text-green-700",
  Pending: "bg-orange-50 text-orange-600",
  Rejected: "bg-red-50 text-red-600",
};
