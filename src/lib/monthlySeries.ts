import { prisma } from "./prisma";
import { PARTIAL_INVOICES } from "./invoiceCollections";
import { collectedOf } from "./invoicePayment";

// The last six calendar months (oldest first) of money collected on invoices / spent on expenses, for the monthly charts.
function buckets() {
  const now = new Date();
  const list: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(d), value: 0 });
  }
  return { list, from: new Date(now.getFullYear(), now.getMonth() - 5, 1) };
}
const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const done = (list: { label: string; value: number }[]) => list.map((b) => ({ label: b.label, value: Math.round(b.value) }));

export async function revenueByMonth() {
  const { list, from } = buckets();
  const rows = await prisma.invoice.findMany({
    where: { date: { gte: from }, OR: [{ status: { not: "Unpaid" } }, PARTIAL_INVOICES] },
    select: { date: true, amount: true, refundedAmount: true, status: true, paidAmount: true },
  });
  for (const r of rows) {
    const b = list.find((x) => x.key === keyOf(r.date));
    if (b) b.value += collectedOf(r);
  }
  return done(list);
}

export async function expensesByMonth() {
  const { list, from } = buckets();
  const rows = await prisma.expense.findMany({ where: { date: { gte: from } }, select: { date: true, amount: true, refundedAmount: true } });
  for (const r of rows) {
    const b = list.find((x) => x.key === keyOf(r.date));
    if (b) b.value += r.amount - r.refundedAmount;
  }
  return done(list);
}
