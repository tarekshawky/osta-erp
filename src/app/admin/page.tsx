import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminDashboardPage() {
  const [revenueAgg, expenseAgg, invoiceCount, employeeCount, recentInvoices] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "Paid" } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.invoice.count(),
    prisma.employee.count(),
    prisma.invoice.findMany({
      orderBy: { date: "desc" },
      take: 8,
      include: { team: true, createdBy: true, customer: true },
    }),
  ]);

  const revenue = revenueAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;

  return (
    <div className="pb-10">
      <AdminTopBar title="Dashboard" />

      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Overview</h2>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Total Revenue" value={formatAed(revenue)} valueClassName="text-blue-700" />
          <AdminStatCard label="Total Invoices" value={String(invoiceCount)} valueClassName="text-green-600" />
          <AdminStatCard label="Total Expenses" value={formatAed(expenses)} valueClassName="text-red-500" />
          <AdminStatCard label="Employees" value={String(employeeCount)} />
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
