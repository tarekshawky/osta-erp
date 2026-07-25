import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { Pagination } from "@/components/admin/Pagination";
import { DeleteQuotationButton } from "@/components/quotation/DeleteQuotationButton";
import { ToastOnMount } from "@/components/ToastOnMount";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { buildDateRange } from "@/lib/dateRangeFilter";
import type { Prisma } from "@/generated/prisma";

export default async function AdminQuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string; page?: string; year?: string; month?: string }>;
}) {
  const { q = "", team = "all", page: pageParam, year: yearParam, month: monthParam } = await searchParams;
  const page = parsePage(pageParam);
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;

  const [teams, totalQuotationsCount, quotationDates] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.quotation.count(),
    prisma.quotation.findMany({ select: { date: true } }),
  ]);

  const years = Array.from(new Set(quotationDates.map((q) => q.date.getFullYear()))).sort((a, b) => b - a);

  const where: Prisma.QuotationWhereInput = {};
  if (q) {
    where.OR = [
      { customerName: { contains: q } },
      { companyName: { contains: q } },
      { number: { contains: q } },
    ];
  }
  if (team !== "all") where.team = { name: team };
  const dateRange = buildDateRange(year, month);
  if (dateRange) where.date = dateRange;

  const filteredCount = await prisma.quotation.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const quotations = await prisma.quotation.findMany({
    where,
    orderBy: { date: "desc" },
    include: { team: true, createdBy: true, items: true },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="pb-10">
      <Suspense fallback={null}>
        <ToastOnMount message="Quotation deleted." />
      </Suspense>
      <AdminTopBar
        title="Quotations"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/quotations" }}
      />

      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quotations</h2>
            <p className="text-sm text-slate-500 mt-0.5">{totalQuotationsCount} records</p>
          </div>
          <Link
            href="/admin/quotations/new"
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + New Quotation
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-1 gap-3 max-w-xs">
          <AdminStatCard label="Total Quotations" value={String(totalQuotationsCount)} valueClassName="text-blue-700" />
        </div>

        <form className="mt-5 flex flex-col sm:flex-row gap-3">
          {year && <input type="hidden" name="year" value={year} />}
          {month && <input type="hidden" name="month" value={month} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by customer or quotation no..."
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
                <th className="px-4 py-3 font-medium">Quotation #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((quo) => {
                const amount = quo.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
                return (
                  <tr key={quo.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                      <Link href={`/admin/quotations/${quo.id}`}>{quo.number}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(quo.date)}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {quo.customerType === "COMPANY" ? quo.companyName || quo.customerName : quo.customerName}
                    </td>
                    <td className="px-4 py-3">
                      <TeamBadge name={quo.team?.name} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {quo.createdBy.name.split(" ").slice(0, 2).join(" ")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatAed(amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/quotations/${quo.id}/edit`}
                          title="Edit"
                          className="text-blue-600 hover:text-blue-700 p-1.5"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                          </svg>
                        </Link>
                        <DeleteQuotationButton
                          quotationId={quo.id}
                          className="text-red-500 hover:text-red-600 p-1.5"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {quotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No quotations match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            basePath="/admin/quotations"
            searchParams={{
              q,
              team,
              year: year ? String(year) : undefined,
              month: month ? String(month) : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
