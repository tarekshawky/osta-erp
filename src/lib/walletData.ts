import { prisma } from "./prisma";

// Sum of every wallet-enabled employee's negative Current Balance (Custody + Cash -
// Expenses), expressed as a positive amount — i.e. how much would need to be added via
// "Collect Money" across everyone right now if every negative balance were collected.
export async function computeCollectMoneyTotal(): Promise<number> {
  const [employees, cashByEmployee, expensesByEmployee] = await Promise.all([
    prisma.employee.findMany({ where: { hasWallet: true }, select: { id: true, custody: true } }),
    prisma.invoice.groupBy({
      by: ["createdById"],
      _sum: { amount: true },
      where: { status: "Paid", payment: "Cash" },
    }),
    prisma.expense.groupBy({ by: ["createdById"], _sum: { amount: true } }),
  ]);

  const cashMap = new Map(cashByEmployee.map((r) => [r.createdById, r._sum.amount ?? 0]));
  const expenseMap = new Map(expensesByEmployee.map((r) => [r.createdById, r._sum.amount ?? 0]));

  let total = 0;
  for (const emp of employees) {
    const balance = emp.custody + (cashMap.get(emp.id) ?? 0) - (expenseMap.get(emp.id) ?? 0);
    if (balance < 0) total += -balance;
  }
  return total;
}
