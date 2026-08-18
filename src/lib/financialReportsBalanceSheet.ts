import { prisma } from "./prisma";
import { canonicalExpensePayment } from "./expenseData";
import { computeRetainedEarnings } from "./financialReportsIncomeStatement";
import { SETTING_ID } from "./settings";

function boundBy(field: "date" | "createdAt", asOfDate: Date) {
  return { [field]: { lte: asOfDate } };
}

// Every formula below is independently date-bounded (asOfDate, and openingDate for
// cash) rather than reusing getCreditCardWalletSummary/getEmployeeFinancials -- both
// of those compute "as of now" with no upper-bound cutoff, which doesn't support a
// comparative Balance Sheet "as at" a prior date.

export async function computeCashAndCashEquivalents(asOfDate: Date): Promise<number> {
  const position = await prisma.cashPosition.findFirst({ orderBy: { updatedAt: "desc" } });
  const openingBalance = position?.openingBalance ?? 0;
  const openingDate = position?.openingDate ?? new Date(0);
  const range = { gte: openingDate, lte: asOfDate };

  const [invoiceInflowRows, expenseOutflowAgg, cardPaymentAgg, payrollAgg] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["payment"],
      _sum: { amount: true, refundedAmount: true },
      where: { status: { not: "Unpaid" }, date: range },
    }),
    prisma.expense.findMany({
      where: { date: range },
      select: { amount: true, refundedAmount: true, payment: true },
    }),
    prisma.creditCardPayment.aggregate({
      _sum: { amount: true },
      where: { paymentMethod: { in: ["Cash", "Bank Transfer"] }, date: range },
    }),
    prisma.payrollEntry.groupBy({
      by: ["type"],
      _sum: { amount: true },
      where: { type: { in: ["Salary", "Advance", "Deduction"] }, date: range },
    }),
  ]);

  const cashLikeInvoiceInflow = invoiceInflowRows
    .filter((r) => ["Cash", "Bank Transfer", "Ziina"].includes(r.payment))
    .reduce((sum, r) => sum + (r._sum.amount ?? 0) - (r._sum.refundedAmount ?? 0), 0);

  const cashLikeExpenseOutflow = expenseOutflowAgg
    .filter((e) => ["Cash", "Bank Transfer"].includes(canonicalExpensePayment(e.payment)))
    .reduce((sum, e) => sum + (e.amount - e.refundedAmount), 0);

  const cardPaymentOutflow = cardPaymentAgg._sum.amount ?? 0;

  const payrollMap = new Map(payrollAgg.map((r) => [r.type, r._sum.amount ?? 0]));
  const grossPayrollCashPaid = (payrollMap.get("Salary") ?? 0) + (payrollMap.get("Advance") ?? 0);
  const payrollDeductionOffset = payrollMap.get("Deduction") ?? 0;

  return (
    openingBalance +
    cashLikeInvoiceInflow -
    cashLikeExpenseOutflow -
    cardPaymentOutflow -
    grossPayrollCashPaid +
    payrollDeductionOffset
  );
}

// Unpaid invoices always carry refundedAmount 0 (a refund can only be recorded
// against a Paid invoice), confirmed in customerData.ts -- no subtraction needed.
export async function computeAccountsReceivable(asOfDate: Date): Promise<number> {
  const agg = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: { status: "Unpaid", ...boundBy("date", asOfDate) },
  });
  return agg._sum.amount ?? 0;
}

// Best-available proxy: employee custody floats represent money advanced to
// employees for operational spending not yet reconciled as expenses. Not truly
// date-bounded, since Employee.custody has no history table -- documented
// limitation for comparative periods.
export async function computeAdvancesDepositsPrepayments(): Promise<number> {
  const agg = await prisma.employee.aggregate({ _sum: { custody: true } });
  return agg._sum.custody ?? 0;
}

function yearsElapsed(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export async function computePPE(asOfDate: Date): Promise<number> {
  const assets = await prisma.asset.findMany({ where: { purchaseDate: { lte: asOfDate } } });
  let total = 0;
  for (const asset of assets) {
    const elapsed = yearsElapsed(asset.purchaseDate, asOfDate);
    const accumulatedDepreciation =
      asset.usefulLifeYears > 0 ? Math.min(asset.purchaseCost, (asset.purchaseCost / asset.usefulLifeYears) * elapsed) : 0;
    total += asset.purchaseCost - accumulatedDepreciation;
  }
  return total;
}

// Always 0 -- this business's Expenses are always already-paid in practice, so no
// vendor-bill tracking workflow was built (confirmed architectural decision).
export function computeAccountsPayable(): number {
  return 0;
}

export async function computeOtherPayables(asOfDate: Date): Promise<number> {
  const [cards, otherLiabilityAgg] = await Promise.all([
    prisma.creditCard.findMany({ select: { id: true } }),
    prisma.liability.aggregate({
      _sum: { amount: true },
      where: { category: "Current", type: "Other", ...boundBy("createdAt", asOfDate) },
    }),
  ]);

  let creditCardOutstanding = 0;
  for (const card of cards) {
    const [expenseAgg, paymentAgg] = await Promise.all([
      prisma.expense.aggregate({
        _sum: { amount: true, refundedAmount: true },
        where: { creditCardId: card.id, ...boundBy("date", asOfDate) },
      }),
      prisma.creditCardPayment.aggregate({
        _sum: { amount: true },
        where: { creditCardId: card.id, ...boundBy("date", asOfDate) },
      }),
    ]);
    const totalExpenses = (expenseAgg._sum.amount ?? 0) - (expenseAgg._sum.refundedAmount ?? 0);
    const totalPayments = paymentAgg._sum.amount ?? 0;
    creditCardOutstanding += totalExpenses - totalPayments;
  }

  return creditCardOutstanding + (otherLiabilityAgg._sum.amount ?? 0);
}

export async function computeBankBorrowings(asOfDate: Date): Promise<{ current: number; nonCurrent: number }> {
  const rows = await prisma.liability.findMany({
    where: { type: "Bank Borrowing", ...boundBy("createdAt", asOfDate) },
  });
  let current = 0;
  let nonCurrent = 0;
  for (const row of rows) {
    if (row.category === "Current") current += row.amount;
    else nonCurrent += row.amount;
  }
  return { current, nonCurrent };
}

export async function computeOtherNonCurrentLiabilities(asOfDate: Date): Promise<number> {
  const agg = await prisma.liability.aggregate({
    _sum: { amount: true },
    where: { category: "Non-Current", type: "Other", ...boundBy("createdAt", asOfDate) },
  });
  return agg._sum.amount ?? 0;
}

// Date-bounded reimplementation of WalletsManager's admin-total formula
// (custody + cash − expenses), scoped to the one configured shareholder employee.
export async function computeShareholdersCurrentAccount(asOfDate: Date, shareholderEmployeeId: string | null): Promise<number> {
  if (!shareholderEmployeeId) return 0;
  const employee = await prisma.employee.findUnique({ where: { id: shareholderEmployeeId }, select: { custody: true } });
  if (!employee) return 0;

  const [invoiceCashAgg, expenseAgg] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { createdById: shareholderEmployeeId, status: "Paid", payment: "Cash", ...boundBy("createdAt", asOfDate) },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdById: shareholderEmployeeId, ...boundBy("createdAt", asOfDate) },
    }),
  ]);

  const cash = invoiceCashAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;
  return employee.custody + cash - expenses;
}

export type BalanceSheetColumn = {
  asOfDate: Date;
  assets: {
    nonCurrent: { propertyPlantEquipment: number; total: number };
    current: { cashAndCashEquivalents: number; accountsReceivable: number; advancesDepositsPrepayments: number; total: number };
    total: number;
  };
  liabilities: {
    nonCurrent: { bankBorrowings: number; otherNonCurrentLiabilities: number; total: number };
    current: { tradeAccountsPayable: number; otherPayables: number; bankBorrowings: number; total: number };
    total: number;
  };
  equity: {
    shareCapital: number;
    statutoryReserves: number;
    retainedEarnings: number;
    shareholdersCurrentAccount: number;
    total: number;
  };
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;
};

export async function computeBalanceSheetColumn(
  asOfDate: Date,
  retainedEarnings: number,
  setting: { shareCapital: number | null; statutoryReserves: number | null; shareholderEmployeeId: string | null }
): Promise<BalanceSheetColumn> {
  const [ppe, cash, ar, advances, ap, otherPayables, bankBorrowings, otherNonCurrentLiabilities, shareholdersCurrentAccount] =
    await Promise.all([
      computePPE(asOfDate),
      computeCashAndCashEquivalents(asOfDate),
      computeAccountsReceivable(asOfDate),
      computeAdvancesDepositsPrepayments(),
      Promise.resolve(computeAccountsPayable()),
      computeOtherPayables(asOfDate),
      computeBankBorrowings(asOfDate),
      computeOtherNonCurrentLiabilities(asOfDate),
      computeShareholdersCurrentAccount(asOfDate, setting.shareholderEmployeeId),
    ]);

  const currentAssetsTotal = cash + ar + advances;
  const nonCurrentAssetsTotal = ppe;
  const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

  const nonCurrentLiabilitiesTotal = bankBorrowings.nonCurrent + otherNonCurrentLiabilities;
  const currentLiabilitiesTotal = ap + otherPayables + bankBorrowings.current;
  const totalLiabilities = nonCurrentLiabilitiesTotal + currentLiabilitiesTotal;

  const shareCapital = setting.shareCapital ?? 0;
  const statutoryReserves = setting.statutoryReserves ?? 0;
  const totalEquity = shareCapital + statutoryReserves + retainedEarnings + shareholdersCurrentAccount;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const difference = totalAssets - totalLiabilitiesAndEquity;

  return {
    asOfDate,
    assets: {
      nonCurrent: { propertyPlantEquipment: ppe, total: nonCurrentAssetsTotal },
      current: { cashAndCashEquivalents: cash, accountsReceivable: ar, advancesDepositsPrepayments: advances, total: currentAssetsTotal },
      total: totalAssets,
    },
    liabilities: {
      nonCurrent: { bankBorrowings: bankBorrowings.nonCurrent, otherNonCurrentLiabilities, total: nonCurrentLiabilitiesTotal },
      current: { tradeAccountsPayable: ap, otherPayables, bankBorrowings: bankBorrowings.current, total: currentLiabilitiesTotal },
      total: totalLiabilities,
    },
    equity: { shareCapital, statutoryReserves, retainedEarnings, shareholdersCurrentAccount, total: totalEquity },
    totalAssets,
    totalLiabilitiesAndEquity,
    difference,
    isBalanced: Math.abs(difference) <= 0.01,
  };
}

export type BalanceSheet = { current: BalanceSheetColumn; comparative: BalanceSheetColumn | null };

// Top-level entry point used by the Balance Sheet report page: fetches Setting once,
// computes each column's Retained Earnings independently (a historical rollup as of
// that column's own asOfDate), and assembles current + optional comparative columns.
export async function computeBalanceSheet({ asOfDate, comparativeDate }: { asOfDate: Date; comparativeDate?: Date | null }): Promise<BalanceSheet> {
  const setting = await prisma.setting.findUnique({
    where: { id: SETTING_ID },
    select: { shareCapital: true, statutoryReserves: true, shareholderEmployeeId: true },
  });
  const settingInput = {
    shareCapital: setting?.shareCapital ?? null,
    statutoryReserves: setting?.statutoryReserves ?? null,
    shareholderEmployeeId: setting?.shareholderEmployeeId ?? null,
  };

  const [currentRetainedEarnings, comparativeRetainedEarnings] = await Promise.all([
    computeRetainedEarnings(asOfDate),
    comparativeDate ? computeRetainedEarnings(comparativeDate) : Promise.resolve(0),
  ]);

  const [current, comparative] = await Promise.all([
    computeBalanceSheetColumn(asOfDate, currentRetainedEarnings, settingInput),
    comparativeDate ? computeBalanceSheetColumn(comparativeDate, comparativeRetainedEarnings, settingInput) : Promise.resolve(null),
  ]);

  return { current, comparative };
}
