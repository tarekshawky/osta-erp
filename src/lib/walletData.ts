import { prisma } from "./prisma";

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

// Sum of every wallet-enabled employee's negative Current Balance (Custody + Cash -
// Expenses), expressed as a positive amount — i.e. how much would need to be added via
// "Collect Money" across everyone right now if every negative balance were collected.
export async function computeCollectMoneyTotal(): Promise<number> {
  const employees = await prisma.employee.findMany({
    where: { hasWallet: true },
    select: { id: true, custody: true, walletResetAt: true },
  });

  let total = 0;
  for (const emp of employees) {
    const financials = await getEmployeeFinancials(emp.id, emp.walletResetAt);
    const balance = emp.custody + financials.cash - financials.expenses;
    if (balance < 0) total += -balance;
  }
  return total;
}
