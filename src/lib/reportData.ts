import { prisma } from "./prisma";

export const CORPORATE_TAX_RATE = 0.09;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type MonthFigures = { revenue: number; expenses: number; salaries: number };

export async function computeAnnualReport(
  year: number,
  team: string | null
): Promise<{ months: MonthFigures[]; monthsElapsed: number }> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthsElapsed = year < currentYear ? 12 : year > currentYear ? 0 : currentMonth;

  const teamFilter = team && team !== "all" ? { team: { name: team } } : {};

  const [invoices, expenses, employees] = await Promise.all([
    prisma.invoice.findMany({ where: teamFilter, select: { date: true, amount: true, refundedAmount: true } }),
    prisma.expense.findMany({ where: teamFilter, select: { date: true, amount: true, refundedAmount: true } }),
    prisma.employee.findMany({ where: teamFilter, select: { monthlySalary: true, createdAt: true } }),
  ]);

  const months: MonthFigures[] = Array.from({ length: 12 }, () => ({ revenue: 0, expenses: 0, salaries: 0 }));

  for (const inv of invoices) {
    if (inv.date.getFullYear() !== year) continue;
    months[inv.date.getMonth()].revenue += inv.amount - inv.refundedAmount;
  }

  for (const exp of expenses) {
    if (exp.date.getFullYear() !== year) continue;
    months[exp.date.getMonth()].expenses += exp.amount - exp.refundedAmount;
  }

  for (let m = 0; m < 12; m++) {
    if (m + 1 > monthsElapsed) continue;
    const monthEnd = new Date(Date.UTC(year, m + 1, 1));
    for (const emp of employees) {
      if (emp.createdAt < monthEnd) {
        months[m].salaries += emp.monthlySalary;
      }
    }
  }

  return { months, monthsElapsed };
}

export function summarize(months: MonthFigures[]) {
  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
  const totalSalaries = months.reduce((s, m) => s + m.salaries, 0);
  const netProfitBeforeTax = totalRevenue - totalExpenses - totalSalaries;
  const corporateTax = Math.max(0, netProfitBeforeTax) * CORPORATE_TAX_RATE;
  const netProfitAfterTax = netProfitBeforeTax - corporateTax;
  return { totalRevenue, totalExpenses, totalSalaries, netProfitBeforeTax, corporateTax, netProfitAfterTax };
}
