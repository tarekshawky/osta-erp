import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { getCreditCardWalletSummary, getMonthlyStatement, getCreditCardTransactions, maskCardNumber } from "@/lib/creditCardData";
import { RecordCreditCardPaymentModal } from "@/components/credit-card/RecordCreditCardPaymentModal";
import { CreditCardWalletDetail, type CreditCardDetailTab } from "@/components/credit-card/CreditCardWalletDetail";
import { CreditCardTransactionsFilterBar } from "@/components/credit-card/CreditCardTransactionsFilterBar";
import { CreditCardTransactionsTable } from "@/components/credit-card/CreditCardTransactionsTable";
import { MonthlyStatementCard } from "@/components/credit-card/MonthlyStatementCard";
import { PaymentHistoryTable } from "@/components/credit-card/PaymentHistoryTable";

export default async function CreditCardWalletDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    search?: string;
    category?: string;
    employeeId?: string;
    vendor?: string;
    status?: string;
    statementYear?: string;
    statementMonth?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const card = await prisma.creditCard.findUnique({ where: { id } });
  if (!card) notFound();

  const tab: CreditCardDetailTab =
    sp.tab === "statement" || sp.tab === "payments" ? sp.tab : "transactions";

  const now = new Date();
  const statementYear = sp.statementYear ? Number(sp.statementYear) : now.getFullYear();
  const statementMonth = sp.statementMonth ? Number(sp.statementMonth) : now.getMonth() + 1;

  const filters = {
    search: sp.search ?? "",
    category: sp.category ?? "",
    employeeId: sp.employeeId ?? "",
    vendor: sp.vendor ?? "",
    status: sp.status ?? "",
  };

  const [summary, statement, transactions, payments, employees, expenseDates] = await Promise.all([
    getCreditCardWalletSummary(card.id, card.creditLimit),
    getMonthlyStatement(card.id, statementYear, statementMonth),
    getCreditCardTransactions(card.id, filters),
    prisma.creditCardPayment.findMany({
      where: { creditCardId: card.id },
      orderBy: { date: "desc" },
      include: { recordedBy: { select: { name: true } } },
    }),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.expense.findMany({ where: { creditCardId: card.id }, select: { date: true } }),
  ]);

  const years = Array.from(
    new Set([now.getFullYear(), ...expenseDates.map((e) => e.date.getFullYear()), ...payments.map((p) => p.date.getFullYear())])
  ).sort((a, b) => b - a);

  const basePath = `/admin/wallets/credit-cards/${card.id}`;

  const transactionRows = transactions.map((t) => ({
    id: t.id,
    number: t.number,
    date: t.date,
    description: t.description,
    category: t.category,
    subcategory: t.subcategory,
    amount: t.amount,
    payment: t.payment,
    vendor: t.vendor,
    referenceNumber: t.referenceNumber,
    attachmentUrl: t.attachmentUrl,
    notes: t.notes,
    status: t.status,
    createdByName: t.createdBy.name,
  }));

  const paymentRows = payments.map((p) => ({
    id: p.id,
    date: p.date,
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    bankAccount: p.bankAccount,
    referenceNumber: p.referenceNumber,
    notes: p.notes,
    recordedByName: p.recordedBy.name,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title={card.cardHolder || card.name} />
      <div className="px-6 py-6">
        <div className="text-sm text-slate-400 mb-1">
          <Link href="/admin/wallets" className="hover:text-slate-600">
            Wallets
          </Link>{" "}
          / {card.name}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{card.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5 font-mono tracking-wide">{maskCardNumber(card.lastFour)}</p>
          </div>
          <RecordCreditCardPaymentModal
            cardId={card.id}
            cardName={card.name}
            outstanding={summary.outstanding}
            trigger={
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5">
                + Record Payment
              </span>
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <AdminStatCard label="Credit Limit" value={formatAed(card.creditLimit)} />
          <AdminStatCard label="Used / Outstanding" value={formatAed(summary.outstanding)} valueClassName="text-red-500" />
          <AdminStatCard label="Available Credit" value={formatAed(summary.availableCredit)} valueClassName="text-green-600" />
          <AdminStatCard label="This Month" value={formatAed(summary.thisMonth)} />
          <AdminStatCard label="Expenses" value={String(summary.expenseCount)} />
        </div>

        <div className="mt-6">
          <CreditCardWalletDetail
            basePath={basePath}
            activeTab={tab}
            transactionCount={transactions.length}
            paymentCount={payments.length}
            transactionsContent={
              <div>
                <CreditCardTransactionsFilterBar basePath={basePath} employees={employees} filters={filters} />
                <CreditCardTransactionsTable transactions={transactionRows} />
              </div>
            }
            statementContent={<MonthlyStatementCard statement={statement} years={years} />}
            paymentsContent={<PaymentHistoryTable payments={paymentRows} />}
          />
        </div>
      </div>
    </div>
  );
}
