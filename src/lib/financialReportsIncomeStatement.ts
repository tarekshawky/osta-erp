import { prisma } from "./prisma";
import { buildCustomDateRange } from "./dateRangeFilter";
import { COST_OF_SERVICES_CATEGORIES } from "./expenseData";
import { CORPORATE_TAX_RATE, CORPORATE_TAX_EXEMPT_THRESHOLD } from "./reportData";
import { ADMIN_EXPENSE_LINES, type DateRange } from "./financialReportsCore";
import { computeInventoryCogs } from "./inventoryData";

export type IncomeStatement = {
  revenue: { serviceRevenue: number; otherRevenue: number; total: number };
  costOfSales: number;
  grossProfit: number;
  adminExpenses: { label: string; amount: number }[];
  totalAdminExpenses: number;
  profitBeforeTax: number;
  corporateTaxExpense: number;
  profitForPeriod: number;
};

// Accrual-basis revenue: EVERY Invoice in range counts (Unpaid included), because
// the new Accounts Receivable line only exists precisely because revenue is
// recognized when invoiced, not when cash is collected. Deliberately differs from
// reportData.ts, which excludes status="Unpaid" -- that engine is never touched by
// this feature (see plan Context).
async function computeServiceRevenue(range: DateRange): Promise<number> {
  const agg = await prisma.invoice.aggregate({
    _sum: { amount: true, refundedAmount: true },
    where: { date: buildCustomDateRange(range.from, range.to) },
  });
  return (agg._sum.amount ?? 0) - (agg._sum.refundedAmount ?? 0);
}

// "Expense-based" Cost of Sales -- category-tagged Expense rows. Still 0 today
// since COST_OF_SERVICES_CATEGORIES is empty (see expenseData.ts), kept ready
// for a future category-based Cost of Sales without a schema change.
async function computeExpenseCostOfSales(range: DateRange): Promise<number> {
  if (COST_OF_SERVICES_CATEGORIES.length === 0) return 0;
  const agg = await prisma.expense.aggregate({
    _sum: { amount: true, refundedAmount: true },
    where: {
      category: { in: COST_OF_SERVICES_CATEGORIES as unknown as string[] },
      date: buildCustomDateRange(range.from, range.to),
    },
  });
  return (agg._sum.amount ?? 0) - (agg._sum.refundedAmount ?? 0);
}

export async function computeIncomeStatement(range: DateRange): Promise<IncomeStatement> {
  const [serviceRevenue, costOfSalesFromExpenses, inventoryCogs, adminExpenseAmounts] = await Promise.all([
    computeServiceRevenue(range),
    computeExpenseCostOfSales(range),
    computeInventoryCogs(range),
    Promise.all(ADMIN_EXPENSE_LINES.map((line) => line.compute(range))),
  ]);
  // Inventory Cost of Goods Sold -- Cost Price x quantity for every inventory
  // item consumed on an Invoice dated within range (src/lib/inventoryData.ts).
  // Recognized when USED, not when purchased -- a Supplier Stock Purchase
  // records its own "Inventory Purchase" Expense (an operating-expense-shaped
  // cash outflow), so folding it in here too would double count.
  const costOfSales = costOfSalesFromExpenses + inventoryCogs;

  const otherRevenue = 0; // no second revenue source exists today; kept as a structured line for future use
  const totalRevenue = serviceRevenue + otherRevenue;
  const grossProfit = totalRevenue - costOfSales;

  const adminExpenses = ADMIN_EXPENSE_LINES.map((line, i) => ({ label: line.label, amount: adminExpenseAmounts[i] }));
  const totalAdminExpenses = adminExpenseAmounts.reduce((sum, amount) => sum + amount, 0);

  const profitBeforeTax = grossProfit - totalAdminExpenses;
  const taxableProfit = Math.max(0, profitBeforeTax);
  const corporateTaxExpense =
    taxableProfit <= CORPORATE_TAX_EXEMPT_THRESHOLD ? 0 : (taxableProfit - CORPORATE_TAX_EXEMPT_THRESHOLD) * CORPORATE_TAX_RATE;
  const profitForPeriod = profitBeforeTax - corporateTaxExpense;

  return {
    revenue: { serviceRevenue, otherRevenue, total: totalRevenue },
    costOfSales,
    grossProfit,
    adminExpenses,
    totalAdminExpenses,
    profitBeforeTax,
    corporateTaxExpense,
    profitForPeriod,
  };
}

// Cumulative accumulated profit for ALL periods strictly before periodStart --
// a real historical rollup, not scoped to just the current tax period.
export async function computeRetainedEarnings(periodStart: Date): Promise<number> {
  const [earliestInvoice, earliestExpense, earliestPayroll] = await Promise.all([
    prisma.invoice.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
    prisma.expense.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
    prisma.payrollEntry.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
  ]);
  const candidates = [earliestInvoice?.date, earliestExpense?.date, earliestPayroll?.date].filter(
    (d): d is Date => d != null
  );
  if (candidates.length === 0) return 0;
  const earliest = new Date(Math.min(...candidates.map((d) => d.getTime())));

  const dayBeforePeriodStart = new Date(periodStart.getTime() - 24 * 60 * 60 * 1000);
  if (dayBeforePeriodStart < earliest) return 0;

  const statement = await computeIncomeStatement({ from: earliest, to: dayBeforePeriodStart });
  return statement.profitForPeriod;
}
