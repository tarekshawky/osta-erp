import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { ImportModal } from "@/components/admin/ImportModal";
import { ToastOnMount } from "@/components/ToastOnMount";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { buildDateRange } from "@/lib/dateRangeFilter";
import { importInvoicesFromExcel } from "./import/actions";
import type { Prisma } from "@/generated/prisma";
import { collectionOf } from "@/lib/invoicePayment";
import { invoiceStatusFilter, partialCollectedTotal, PARTIAL_INVOICES } from "@/lib/invoiceCollections";

const STATE_STYLE = {
  PAID: "bg-green-50 text-green-700",
  UNPAID: "bg-red-50 text-red-600",
  "PARTIALLY PAID": "bg-orange-50 text-orange-600",
} as const;

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string; status?: string; page?: string; year?: string; month?: string }>;
}) {
  const { q = "", team = "all", status = "all", page: pageParam, year: yearParam, month: monthParam } = await searchParams;
  const page = parsePage(pageParam);
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;

  const [teams, allInvoices, paidInvoices, invoiceDates] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "Paid" } }),
    prisma.invoice.findMany({ select: { date: true } }),
  ]);

  const years = Array.from(new Set(invoiceDates.map((i) => i.date.getFullYear()))).sort((a, b) => b - a);

  const [paidCount, unpaidCount, partialCount, partiallyRefundedCount, refundedCount, openAgg, partialCollected] = await Promise.all([
    prisma.invoice.count({ where: { status: "Paid" } }),
    prisma.invoice.count({ where: { status: "Unpaid", paidAmount: 0 } }),
    prisma.invoice.count({ where: PARTIAL_INVOICES }),
    prisma.invoice.count({ where: { status: "Partially Refunded" } }),
    prisma.invoice.count({ where: { status: "Refunded" } }),
    prisma.invoice.aggregate({ _sum: { amount: true, paidAmount: true }, where: { status: "Unpaid" } }),
    partialCollectedTotal(),
  ]);
  // Collected = fully paid invoices plus what has been received on part-paid ones; still owed = open invoices less that part.
  const totalPaidAmount = (paidInvoices._sum.amount ?? 0) + partialCollected;
  const totalUnpaidAmount = (openAgg._sum.amount ?? 0) - (openAgg._sum.paidAmount ?? 0);

  const where: Prisma.InvoiceWhereInput = {};
  if (q) {
    where.OR = [
      { customer: { name: { contains: q } } },
      { customer: { companyName: { contains: q } } },
      { number: { contains: q } },
    ];
  }
  if (team !== "all") where.team = { name: team };
  Object.assign(where, invoiceStatusFilter(status));
  const dateRange = buildDateRange(year, month);
  if (dateRange) where.date = dateRange;

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
      <Suspense fallback={null}>
        <ToastOnMount message="Invoice deleted." />
      </Suspense>
      <AdminTopBar
        title="Invoices"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/invoices" }}
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
                ...(month ? { month: String(month) } : {}),
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

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
          <AdminStatCard label="Total Invoiced Amount" value={formatAed(allInvoices._sum.amount ?? 0)} valueClassName="text-blue-700" />
          <AdminStatCard label="Total Paid Amount" value={formatAed(totalPaidAmount)} valueClassName="text-green-600" />
          <AdminStatCard label="Total Unpaid Amount" value={formatAed(totalUnpaidAmount)} valueClassName="text-red-600" />
          <AdminStatCard label="Partially Paid" value={String(partialCount)} valueClassName="text-orange-500" />
          <AdminStatCard label="Paid Invoices" value={String(paidCount)} valueClassName="text-green-600" />
          <AdminStatCard label="Unpaid Invoices" value={String(unpaidCount)} valueClassName="text-red-600" />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {allInvoices._count} invoices · {partiallyRefundedCount} partially refunded · {refundedCount} refunded
        </div>

        <form className="mt-5 flex flex-col sm:flex-row gap-3">
          {year && <input type="hidden" name="year" value={year} />}
          {month && <input type="hidden" name="month" value={month} />}
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All Invoices</option>
            <option value="Paid">Paid Invoices</option>
            <option value="Unpaid">Unpaid Invoices</option>
            <option value="PartiallyPaid">Partially Paid Invoices</option>
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
                <th className="px-4 py-3 font-medium">Payment Method</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment Date</th>
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
                    {inv.status === "Unpaid" && collectionOf(inv).received > 0 && (
                      <div className="text-[11px] font-normal text-orange-600">Remaining {formatAed(collectionOf(inv).remaining)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {inv.status === "Paid" || inv.status === "Unpaid" ? (
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLE[collectionOf(inv).state]}`}>{collectionOf(inv).state}</span>
                    ) : (
                      <StatusBadge status={inv.status} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {collectionOf(inv).paymentDate ? formatDate(collectionOf(inv).paymentDate as Date) : "—"}
                    {collectionOf(inv).paymentDateIsEstimate ? <span title="Collected when the invoice was issued"> *</span> : null}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
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
            searchParams={{ q, team, status, year: year ? String(year) : undefined, month: month ? String(month) : undefined }}
          />
        </div>
      </div>
    </div>
  );
}
