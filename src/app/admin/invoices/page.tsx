import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { ImportModal } from "@/components/admin/ImportModal";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { importInvoicesFromExcel } from "./import/actions";
import type { Prisma } from "@/generated/prisma";

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string; status?: string; page?: string; year?: string }>;
}) {
  const { q = "", team = "all", status = "all", page: pageParam, year: yearParam } = await searchParams;
  const page = parsePage(pageParam);
  const year = yearParam ? Number(yearParam) : null;

  const [teams, allInvoices, invoiceDates] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.invoice.findMany({ select: { date: true } }),
  ]);

  const years = Array.from(new Set(invoiceDates.map((i) => i.date.getFullYear()))).sort((a, b) => b - a);

  const [paidCount, partiallyRefundedCount, refundedCount] = await Promise.all([
    prisma.invoice.count({ where: { status: "Paid" } }),
    prisma.invoice.count({ where: { status: "Partially Refunded" } }),
    prisma.invoice.count({ where: { status: "Refunded" } }),
  ]);

  const where: Prisma.InvoiceWhereInput = {};
  if (q) {
    where.OR = [
      { customer: { name: { contains: q } } },
      { customer: { companyName: { contains: q } } },
      { number: { contains: q } },
    ];
  }
  if (team !== "all") where.team = { name: team };
  if (status !== "all") where.status = status;
  if (year) where.date = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };

  const filteredCount = await prisma.invoice.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { date: "desc" },
    include: { team: true, createdBy: true, customer: true, items: true },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Invoices"
        yearFilter={{ years, selected: year ?? "all", basePath: "/admin/invoices" }}
      />

      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
            <p className="text-sm text-slate-500 mt-0.5">{allInvoices._count} records</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/admin/invoices/export?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(team !== "all" ? { team } : {}),
                ...(status !== "all" ? { status } : {}),
                ...(year ? { year: String(year) } : {}),
              }).toString()}`}
              className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export
            </a>
            <ImportModal
              title="Import Invoices"
              templateHref="/admin/invoices/import/template"
              onImport={importInvoicesFromExcel}
              trigger={
                <span className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21V9m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Import
                </span>
              }
            />
            <Link
              href="/admin/invoices/new"
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
            >
              + New Invoice
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <AdminStatCard label="Total Revenue" value={formatAed(allInvoices._sum.amount ?? 0)} valueClassName="text-blue-700" />
          <AdminStatCard label="Total Invoices" value={String(allInvoices._count)} valueClassName="text-green-600" />
          <AdminStatCard label="Paid" value={String(paidCount)} valueClassName="text-green-600" />
          <AdminStatCard label="Partially Refunded" value={String(partiallyRefundedCount)} valueClassName="text-orange-500" />
          <AdminStatCard label="Refunded" value={String(refundedCount)} valueClassName="text-red-500" />
        </div>

        <form className="mt-5 flex flex-col sm:flex-row gap-3">
          {year && <input type="hidden" name="year" value={year} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by customer or invoice no..."
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="team"
            defaultValue={team}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Refunded">Partially Refunded</option>
            <option value="Refunded">Refunded</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Filter
          </button>
        </form>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                    <Link href={`/admin/invoices/${inv.id}`}>{inv.number}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {inv.customer.type === "COMPANY" ? inv.customer.companyName : inv.customer.name}
                  </td>
                  <td className="px-4 py-3">
                    <TeamBadge name={inv.team?.name} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {inv.createdBy.name.split(" ").slice(0, 2).join(" ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.items.map((it) => it.serviceName).join(", ")}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.payment}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {formatAed(inv.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No invoices match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            basePath="/admin/invoices"
            searchParams={{ q, team, status, year: year ? String(year) : undefined }}
          />
        </div>
      </div>
    </div>
  );
}
