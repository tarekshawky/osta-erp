import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { getPaymentTotals } from "@/lib/reportData";
import { buildDateRange } from "@/lib/dateRangeFilter";
import { getCollectMoneyTotal } from "@/lib/walletData";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;
  const dateRange = buildDateRange(year, month);

  const [invoiceDates, revenueAgg, expenseAgg, invoiceCount, employeeCount, paymentTotals, collectMoneyTotal, recentInvoices] =
    await Promise.all([
      prisma.invoice.findMany({ select: { date: true } }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "Paid", ...(dateRange ? { date: dateRange } : {}) },
      }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: dateRange ? { date: dateRange } : {} }),
      prisma.invoice.count({ where: dateRange ? { date: dateRange } : {} }),
      prisma.employee.count(),
      getPaymentTotals(dateRange ? { date: dateRange } : {}),
      getCollectMoneyTotal(),
      prisma.invoice.findMany({
        where: dateRange ? { date: dateRange } : {},
        orderBy: { date: "desc" },
        take: 8,
        include: { team: true, createdBy: true, customer: true },
      }),
    ]);

  const years = Array.from(new Set(invoiceDates.map((i) => i.date.getFullYear()))).sort((a, b) => b - a);
  const revenue = revenueAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Dashboard"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin" }}
      />

      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Overview</h2>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Total Revenue" value={formatAed(revenue)} valueClassName="text-blue-700" />
          <AdminStatCard label="Total Invoices" value={String(invoiceCount)} valueClassName="text-green-600" />
          <AdminStatCard label="Total Expenses" value={formatAed(expenses)} valueClassName="text-red-500" />
          <AdminStatCard label="Employees" value={String(employeeCount)} />
        </div>

        <h3 className="mt-6 font-semibold text-slate-900">Revenue by Payment Method</h3>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <AdminStatCard label="Cash" value={formatAed(paymentTotals.cash)} valueClassName="text-emerald-600" />
          <AdminStatCard label="Ziina" value={formatAed(paymentTotals.ziina)} valueClassName="text-blue-700" />
          <AdminStatCard
            label="Bank Transfer"
            value={formatAed(paymentTotals.bankTransfer)}
            valueClassName="text-purple-600"
          />
        </div>

        <h3 className="mt-6 font-semibold text-slate-900">Wallets</h3>
        <div className="mt-3 max-w-sm rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 text-white p-4">
          <div className="text-xs text-teal-100">Collect Money Total</div>
          <div className="text-2xl font-bold mt-1">{formatAed(collectMoneyTotal)}</div>
          <div className="text-xs text-teal-100 mt-1">Lifetime total collected via Collect Money</div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recent Invoices</h3>
          <Link href="/admin/invoices" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-blue-600">
                    <Link href={`/admin/invoices/${inv.id}`}>{inv.number}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {inv.customer.type === "COMPANY" ? inv.customer.companyName : inv.customer.name}
                  </td>
                  <td className="px-4 py-3">
                    <TeamBadge name={inv.team?.name} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.createdBy.name.split(" ").slice(0, 2).join(" ")}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatAed(inv.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No invoices in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
