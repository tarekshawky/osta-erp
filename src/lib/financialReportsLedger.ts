import { prisma } from "./prisma";
import { buildCustomDateRange } from "./dateRangeFilter";
import { canonicalExpensePayment } from "./expenseData";
import { computeCashAndCashEquivalents } from "./financialReportsBalanceSheet";
import type { DateRange } from "./financialReportsCore";

// Fixed chart-of-accounts bucket names used by the General Ledger / Trial Balance /
// Cash Flow Statement. This is a READ-ONLY PROJECTION over existing Invoice/Expense/
// PayrollEntry/CreditCardPayment/Asset rows -- deliberately NOT a true double-entry
// ledger (confirmed architectural decision). No existing money-moving feature writes
// journal entries; every row below is mapped to its account(s) at query time.
export const CHART_OF_ACCOUNTS = [
  "Cash",
  "Accounts Receivable",
  "Revenue",
  "Expenses",
  "Salary Expense",
  "Credit Card Liability",
] as const;

export type LedgerRow = {
  date: Date;
  description: string;
  account: (typeof CHART_OF_ACCOUNTS)[number];
  debit: number;
  credit: number;
};

// Every underlying row mapping to the given account bucket, in range, each
// annotated with its debit/credit side. A Paid invoice: {debit: Cash, credit:
// Revenue}. An Unpaid invoice: {debit: Accounts Receivable, credit: Revenue}. An
// Expense: {debit: Expenses (or Salary Expense for Payroll), credit: Cash or
// Credit Card Liability}.
export async function getGeneralLedger({ account, from, to }: { account: (typeof CHART_OF_ACCOUNTS)[number] } & DateRange): Promise<LedgerRow[]> {
  const range = buildCustomDateRange(from, to);
  const rows: LedgerRow[] = [];

  if (account === "Cash" || account === "Revenue" || account === "Accounts Receivable") {
    const invoices = await prisma.invoice.findMany({
      where: { date: range },
      select: { date: true, number: true, amount: true, refundedAmount: true, payment: true, status: true },
    });
    for (const inv of invoices) {
      const net = inv.amount - inv.refundedAmount;
      const isCashLike = inv.status !== "Unpaid";
      if (account === "Cash" && isCashLike) {
        rows.push({ date: inv.date, description: `Invoice ${inv.number}`, account: "Cash", debit: net, credit: 0 });
      }
      if (account === "Accounts Receivable" && !isCashLike) {
        rows.push({ date: inv.date, description: `Invoice ${inv.number}`, account: "Accounts Receivable", debit: net, credit: 0 });
      }
      if (account === "Revenue") {
        rows.push({ date: inv.date, description: `Invoice ${inv.number}`, account: "Revenue", debit: 0, credit: net });
      }
    }
  }

  if (account === "Cash" || account === "Expenses" || account === "Salary Expense" || account === "Credit Card Liability") {
    const expenses = await prisma.expense.findMany({
      where: { date: range },
      select: { date: true, description: true, number: true, amount: true, refundedAmount: true, payment: true, creditCardId: true },
    });
    for (const exp of expenses) {
      const net = exp.amount - exp.refundedAmount;
      const isCard = exp.creditCardId != null;
      const isCashLike = !isCard && ["Cash", "Bank Transfer"].includes(canonicalExpensePayment(exp.payment));
      if (account === "Expenses") {
        rows.push({ date: exp.date, description: exp.number ?? exp.description, account: "Expenses", debit: net, credit: 0 });
      }
      if (account === "Cash" && isCashLike) {
        rows.push({ date: exp.date, description: exp.number ?? exp.description, account: "Cash", debit: 0, credit: net });
      }
      if (account === "Credit Card Liability" && isCard) {
        rows.push({ date: exp.date, description: exp.number ?? exp.description, account: "Credit Card Liability", debit: 0, credit: net });
      }
    }
  }

  if (account === "Cash" || account === "Salary Expense") {
    const payroll = await prisma.payrollEntry.findMany({
      where: { type: { in: ["Salary", "Advance"] }, date: range },
      select: { date: true, amount: true, note: true, employee: { select: { name: true } } },
    });
    for (const entry of payroll) {
      if (account === "Salary Expense") {
        rows.push({
          date: entry.date,
          description: entry.note ?? `Payroll — ${entry.employee.name}`,
          account: "Salary Expense",
          debit: entry.amount,
          credit: 0,
        });
      }
      if (account === "Cash") {
        rows.push({
          date: entry.date,
          description: entry.note ?? `Payroll — ${entry.employee.name}`,
          account: "Cash",
          debit: 0,
          credit: entry.amount,
        });
      }
    }
  }

  if (account === "Cash" || account === "Credit Card Liability") {
    const payments = await prisma.creditCardPayment.findMany({
      where: { date: range },
      select: { date: true, amount: true, referenceNumber: true, paymentMethod: true },
    });
    for (const p of payments) {
      if (account === "Credit Card Liability") {
        rows.push({ date: p.date, description: p.referenceNumber ?? "Credit Card Payment", account: "Credit Card Liability", debit: p.amount, credit: 0 });
      }
      if (account === "Cash" && ["Cash", "Bank Transfer"].includes(p.paymentMethod)) {
        rows.push({ date: p.date, description: p.referenceNumber ?? "Credit Card Payment", account: "Cash", debit: 0, credit: p.amount });
      }
    }
  }

  return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type TrialBalanceRow = { account: (typeof CHART_OF_ACCOUNTS)[number]; debit: number; credit: number };

// One row per chart-of-accounts bucket, summed debit/credit for the range. Should
// always tie out (SUM(debit) === SUM(credit)) by construction -- the same
// transactions are bucketed on both sides, unlike the Balance Sheet check, which can
// genuinely be unbalanced since its figures come from independently-derived sources.
export async function getTrialBalance(range: DateRange): Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }> {
  const rows: TrialBalanceRow[] = await Promise.all(
    CHART_OF_ACCOUNTS.map(async (account) => {
      const ledgerRows = await getGeneralLedger({ account, ...range });
      return {
        account,
        debit: ledgerRows.reduce((sum, r) => sum + r.debit, 0),
        credit: ledgerRows.reduce((sum, r) => sum + r.credit, 0),
      };
    })
  );
  return {
    rows,
    totalDebit: rows.reduce((sum, r) => sum + r.debit, 0),
    totalCredit: rows.reduce((sum, r) => sum + r.credit, 0),
  };
}

export type CashFlowStatement = {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  openingCash: number;
  closingCash: number;
};

// Direct method. Reconciled against computeCashAndCashEquivalents so this
// statement always ties to the Balance Sheet's Cash line.
export async function computeCashFlowStatement({ from, to }: DateRange): Promise<CashFlowStatement> {
  const range = buildCustomDateRange(from, to);
  const dayBeforeFrom = new Date(from.getTime() - 24 * 60 * 60 * 1000);

  const [openingCash, closingCash, assetPurchaseAgg, liabilityAgg, cardPaymentAgg] = await Promise.all([
    computeCashAndCashEquivalents(dayBeforeFrom),
    computeCashAndCashEquivalents(to),
    prisma.asset.aggregate({ _sum: { purchaseCost: true }, where: { purchaseDate: range } }),
    prisma.liability.aggregate({ _sum: { amount: true }, where: { createdAt: range } }),
    prisma.creditCardPayment.aggregate({
      _sum: { amount: true },
      where: { paymentMethod: { in: ["Cash", "Bank Transfer"] }, date: range },
    }),
  ]);

  const investing = -(assetPurchaseAgg._sum.purchaseCost ?? 0);
  const financing = (liabilityAgg._sum.amount ?? 0) - (cardPaymentAgg._sum.amount ?? 0);
  const netChange = closingCash - openingCash;
  const operating = netChange - investing - financing;

  return { operating, investing, financing, netChange, openingCash, closingCash };
}
