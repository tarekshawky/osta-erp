import { prisma } from "./prisma";
import { SETTING_ID } from "./settings";

export type EmployeeFinancials = {
  cash: number;
  ziina: number;
  bankTransfer: number;
  revenue: number;
  expenses: number;
};

// Sums a single employee's Paid-invoice revenue (by payment method) and expenses,
// scoped to activity since their last "Collect Money" reset (or all-time if never
// collected). This is the source of truth for every per-employee wallet figure —
// Wallets page cards, the Employees list Revenue column, and the employee's own
// dashboard — so a collection always zeroes them out consistently everywhere.
export async function getEmployeeFinancials(
  employeeId: string,
  walletResetAt: Date | null
): Promise<EmployeeFinancials> {
  const dateFilter = walletResetAt ? { gte: walletResetAt } : undefined;

  const [invoicesByPayment, expenseAgg] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["payment"],
      _sum: { amount: true },
      where: { createdById: employeeId, status: "Paid", ...(dateFilter ? { date: dateFilter } : {}) },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdById: employeeId, ...(dateFilter ? { date: dateFilter } : {}) },
    }),
  ]);

  const paymentMap = new Map(invoicesByPayment.map((r) => [r.payment, r._sum.amount ?? 0]));
  const cash = paymentMap.get("Cash") ?? 0;
  const ziina = paymentMap.get("Ziina") ?? 0;
  const bankTransfer = paymentMap.get("Bank Transfer") ?? 0;

  return {
    cash,
    ziina,
    bankTransfer,
    revenue: cash + ziina + bankTransfer,
    expenses: expenseAgg._sum.amount ?? 0,
  };
}

// Lifetime running total of every amount ever collected via "Collect Money" — persists
// across resets (unlike the per-wallet figures it zeroes out), only ever grows.
export async function getCollectMoneyTotal(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { id: SETTING_ID } });
  return setting?.collectMoneyTotal ?? 0;
}

// Records a collection: adds the absolute value of the balance that was just zeroed
// out to the lifetime running total.
export async function recordCollectedAmount(amount: number): Promise<void> {
  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, collectMoneyTotal: Math.abs(amount) },
    update: { collectMoneyTotal: { increment: Math.abs(amount) } },
  });
}
