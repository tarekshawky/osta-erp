import { prisma } from "./prisma";
import { canonicalExpensePayment } from "./expenseData";
import { computeRetainedEarnings } from "./financialReportsIncomeStatement";
import { SETTING_ID } from "./settings";
// Lives in financialReportsCore.ts (not here) so financialReportsIncomeStatement.ts
// can also use it for the Depreciation Expense line without a circular import
// between the Income Statement and Balance Sheet modules. Re-exported so every
// existing importer (export/route.ts, assets/page.tsx, asset-report/page.tsx)
// keeps working unchanged.
import { computeAssetDepreciation } from "./financialReportsCore";
export { computeAssetDepreciation };

// Callers often pass a date-only "as of" value (midnight UTC of a calendar day).
// Bounding "createdAt" (a precise insert-time timestamp) against that exact
// midnight would wrongly exclude everything created later that same day, so every
// upper bound is normalized to the end of its calendar day.
function endOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function boundBy(field: "date" | "createdAt", asOfDate: Date) {
  return { [field]: { lte: endOfDayUtc(asOfDate) } };
}

// Every formula below is independently date-bounded (asOfDate, and openingDate for
// cash) rather than reusing getCreditCardWalletSummary/getEmployeeFinancials -- both
// of those compute "as of now" with no upper-bound cutoff, which doesn't support a
// comparative Balance Sheet "as at" a prior date.

// `overrideCashPosition` lets a candidate (not-yet-saved) opening balance/date be
// checked before it's persisted -- see checkOpeningBalance(), used to block saving
// an opening balance that would leave the sheet unbalanced.
export async function computeCashAndCashEquivalents(
  asOfDate: Date,
  overrideCashPosition?: { openingBalance: number; openingDate: Date }
): Promise<number> {
  const position = overrideCashPosition ?? (await prisma.cashPosition.findFirst({ orderBy: { updatedAt: "desc" } }));
  const openingBalance = position?.openingBalance ?? 0;
  const openingDate = position?.openingDate ?? new Date(0);
  const range = { gte: openingDate, lte: endOfDayUtc(asOfDate) };

  const [invoiceInflowRows, expenseOutflowAgg, cardPaymentAgg, payrollAgg, assetPurchaseAgg, liabilityAgg] = await Promise.all([
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
    // A Fixed Asset purchase is a real cash outflow -- the Cash Flow Statement's
    // Investing line already assumes this (see computeCashFlowStatement), but until
    // now this Balance Sheet's own Cash figure never actually subtracted it, so
    // every Asset added inflated Total Assets (PPE) with nothing reducing Cash.
    prisma.asset.aggregate({ _sum: { purchaseCost: true }, where: { purchaseDate: range } }),
    // Symmetrically, a Liability (e.g. a bank loan) is real cash received --
    // otherwise Total Liabilities grows with nothing backing it on the Asset side.
    prisma.liability.aggregate({ _sum: { amount: true }, where: { createdAt: range } }),
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

  const assetPurchaseOutflow = assetPurchaseAgg._sum.purchaseCost ?? 0;
  const liabilityInflow = liabilityAgg._sum.amount ?? 0;

  return (
    openingBalance +
    cashLikeInvoiceInflow -
    cashLikeExpenseOutflow -
    cardPaymentOutflow -
    grossPayrollCashPaid +
    payrollDeductionOffset -
    assetPurchaseOutflow +
    liabilityInflow
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

export type AccountsReceivableRow = { id: string; number: string; date: Date; customerName: string; amount: number };

export async function getAccountsReceivableDetail(asOfDate: Date): Promise<{ rows: AccountsReceivableRow[]; total: number }> {
  const invoices = await prisma.invoice.findMany({
    where: { status: "Unpaid", ...boundBy("date", asOfDate) },
    orderBy: { date: "desc" },
    include: { customer: { select: { name: true, companyName: true, type: true } } },
  });
  const rows = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    date: inv.date,
    customerName: inv.customer.type === "COMPANY" ? inv.customer.companyName ?? inv.customer.name : inv.customer.name,
    amount: inv.amount,
  }));
  return { rows, total: rows.reduce((sum, r) => sum + r.amount, 0) };
}

// Best-available proxy: employee custody floats represent money advanced to
// employees for operational spending not yet reconciled as expenses. Not truly
// date-bounded, since Employee.custody has no history table -- documented
// limitation for comparative periods.
export async function computeAdvancesDepositsPrepayments(): Promise<number> {
  const agg = await prisma.employee.aggregate({ _sum: { custody: true } });
  return agg._sum.custody ?? 0;
}

export async function computePPE(asOfDate: Date): Promise<number> {
  const assets = await prisma.asset.findMany({ where: { purchaseDate: { lte: endOfDayUtc(asOfDate) } } });
  let total = 0;
  for (const asset of assets) {
    total += computeAssetDepreciation(asset, asOfDate).netBookValue;
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

// A prior version reimplemented WalletsManager's per-employee wallet formula here
// (custody + cash − expenses, using Invoice/Expense.createdById as a proxy for
// "money this person personally handled"). That proxy holds for a field employee
// who only ever logs their own collections/claims, but breaks down for whichever
// employee is configured as the shareholder here -- typically the admin/CEO, who
// administratively creates Invoice/Expense rows company-wide, not just their own.
// Confirmed on real data: the admin had created AED 58k of Expense rows (every
// category/payment method, entered on behalf of the whole company) against only
// AED 26k of his own Cash-paid Invoices, producing a fabricated ~AED 32k negative
// swing with no relationship to real shareholder drawings/contributions -- the
// single largest driver of this report's imbalance. There is no reliable signal
// in the current data model to separate a shareholder's personal transactions
// from their administrative data entry, so this now reports the one figure that
// IS real and dedicated for this purpose: the employee's own `custody` balance
// (money actually advanced to/held by them, tracked as its own field with proper
// create/reset semantics) -- not truly date-bounded, same documented limitation
// as computeAdvancesDepositsPrepayments.
export async function computeShareholdersCurrentAccount(asOfDate: Date, shareholderEmployeeId: string | null): Promise<number> {
  void asOfDate;
  if (!shareholderEmployeeId) return 0;
  const employee = await prisma.employee.findUnique({ where: { id: shareholderEmployeeId }, select: { custody: true } });
  return employee?.custody ?? 0;
}

export type OpeningBalanceCheck = {
  isBalanced: boolean;
  difference: number;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  suggestedOpeningBalance: number;
};

// Validates a candidate {openingBalance, openingDate} against Setting's Share
// Capital/Statutory Reserves BEFORE either is saved -- computes the full Balance
// Sheet identity AS AT openingDate itself (the day the books "open," so Retained
// Earnings/Other Payables/etc. should all still be at their earliest values) and
// reports the exact Cash figure that would make Assets = Liabilities + Equity.
// This is what makes an inconsistent opening balance impossible to save, per the
// requirement that Share Capital/Bank/Cash/Payables/Receivables opening balances
// must reconcile before they're accepted.
export async function checkOpeningBalance(input: {
  openingBalance: number;
  openingDate: Date;
  shareCapital: number;
  statutoryReserves: number;
  shareholderEmployeeId: string | null;
}): Promise<OpeningBalanceCheck> {
  const { openingBalance, openingDate, shareCapital, statutoryReserves, shareholderEmployeeId } = input;

  const [ppe, cash, ar, advances, otherPayables, bankBorrowings, otherNonCurrentLiabilities, shareholdersCurrentAccount, retainedEarnings] =
    await Promise.all([
      computePPE(openingDate),
      computeCashAndCashEquivalents(openingDate, { openingBalance, openingDate }),
      computeAccountsReceivable(openingDate),
      computeAdvancesDepositsPrepayments(),
      computeOtherPayables(openingDate),
      computeBankBorrowings(openingDate),
      computeOtherNonCurrentLiabilities(openingDate),
      computeShareholdersCurrentAccount(openingDate, shareholderEmployeeId),
      computeRetainedEarnings(openingDate),
    ]);

  const totalAssets = ppe + cash + ar + advances;
  const totalLiabilitiesAndEquity =
    otherPayables +
    bankBorrowings.current +
    bankBorrowings.nonCurrent +
    otherNonCurrentLiabilities +
    shareCapital +
    statutoryReserves +
    retainedEarnings +
    shareholdersCurrentAccount;

  const difference = totalAssets - totalLiabilitiesAndEquity;
  return {
    isBalanced: Math.abs(difference) <= 0.01,
    difference,
    totalAssets,
    totalLiabilitiesAndEquity,
    suggestedOpeningBalance: openingBalance - difference,
  };
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
