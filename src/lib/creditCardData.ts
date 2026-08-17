import { prisma } from "./prisma";
import { buildDateRange } from "./dateRangeFilter";
import type { Prisma } from "@/generated/prisma";

export const CREDIT_CARD_STATUSES = ["Active", "Inactive"] as const;

// Paying off a card via the card itself doesn't make sense -- deliberately excludes
// "Credit Card" from the Expense payment-method list.
export const CREDIT_CARD_PAYMENT_METHODS = ["Cash", "Bank Transfer"] as const;

export function maskCardNumber(lastFour: string): string {
  return `•••• ${lastFour}`;
}

export type CreditCardWalletSummary = {
  totalExpenses: number;
  totalPayments: number;
  currentUsed: number;
  outstanding: number;
  availableCredit: number;
  thisMonth: number;
  expenseCount: number;
};

// Current Used and Outstanding are the same figure (gross lifetime expenses minus
// lifetime payments) -- the spec's own worked examples use them interchangeably as
// two different stat-card labels, not two different formulas. Recording a payment
// (CreditCardPayment) never touches Expense, so this never double-counts.
export async function getCreditCardWalletSummary(cardId: string, creditLimit: number): Promise<CreditCardWalletSummary> {
  const now = new Date();
  const monthRange = buildDateRange(now.getFullYear(), now.getMonth() + 1)!;

  const [expenseAgg, paymentAgg, thisMonthAgg, expenseCount] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { amount: true, refundedAmount: true },
      where: { creditCardId: cardId },
    }),
    prisma.creditCardPayment.aggregate({
      _sum: { amount: true },
      where: { creditCardId: cardId },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true, refundedAmount: true },
      where: { creditCardId: cardId, date: monthRange },
    }),
    prisma.expense.count({ where: { creditCardId: cardId } }),
  ]);

  const totalExpenses = (expenseAgg._sum.amount ?? 0) - (expenseAgg._sum.refundedAmount ?? 0);
  const totalPayments = paymentAgg._sum.amount ?? 0;
  const currentUsed = totalExpenses - totalPayments;
  const thisMonth = (thisMonthAgg._sum.amount ?? 0) - (thisMonthAgg._sum.refundedAmount ?? 0);

  return {
    totalExpenses,
    totalPayments,
    currentUsed,
    outstanding: currentUsed,
    availableCredit: creditLimit - currentUsed,
    thisMonth,
    expenseCount,
  };
}

export type MonthlyStatement = {
  year: number;
  month: number;
  openingBalance: number;
  totalExpenses: number;
  totalPayments: number;
  outstanding: number;
};

export async function getMonthlyStatement(cardId: string, year: number, month: number): Promise<MonthlyStatement> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthRange = buildDateRange(year, month)!;

  const [beforeExpenseAgg, beforePaymentAgg, monthExpenseAgg, monthPaymentAgg] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { amount: true, refundedAmount: true },
      where: { creditCardId: cardId, date: { lt: monthStart } },
    }),
    prisma.creditCardPayment.aggregate({
      _sum: { amount: true },
      where: { creditCardId: cardId, date: { lt: monthStart } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true, refundedAmount: true },
      where: { creditCardId: cardId, date: monthRange },
    }),
    prisma.creditCardPayment.aggregate({
      _sum: { amount: true },
      where: { creditCardId: cardId, date: monthRange },
    }),
  ]);

  const openingBalance =
    (beforeExpenseAgg._sum.amount ?? 0) - (beforeExpenseAgg._sum.refundedAmount ?? 0) - (beforePaymentAgg._sum.amount ?? 0);
  const totalExpenses = (monthExpenseAgg._sum.amount ?? 0) - (monthExpenseAgg._sum.refundedAmount ?? 0);
  const totalPayments = monthPaymentAgg._sum.amount ?? 0;

  return {
    year,
    month,
    openingBalance,
    totalExpenses,
    totalPayments,
    outstanding: openingBalance + totalExpenses - totalPayments,
  };
}

export type CreditCardTransactionFilters = {
  search?: string;
  year?: number | null;
  month?: number | null;
  category?: string;
  employeeId?: string;
  vendor?: string;
  status?: string;
};

export async function getCreditCardTransactions(cardId: string, filters: CreditCardTransactionFilters) {
  const dateRange = buildDateRange(filters.year ?? null, filters.month ?? null);
  const where: Prisma.ExpenseWhereInput = {
    creditCardId: cardId,
    ...(dateRange ? { date: dateRange } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.employeeId ? { createdById: filters.employeeId } : {}),
    ...(filters.vendor ? { vendor: { contains: filters.vendor, mode: "insensitive" } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { description: { contains: filters.search, mode: "insensitive" } },
            { vendor: { contains: filters.search, mode: "insensitive" } },
            { number: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { createdBy: { select: { name: true, code: true } } },
  });
}
