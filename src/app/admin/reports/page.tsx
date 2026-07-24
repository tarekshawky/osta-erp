import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ReportTeamSelect } from "@/components/admin/ReportTeamSelect";
import { computeAnnualReport, summarize, MONTH_NAMES } from "@/lib/reportData";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; team?: string }>;
}) {
  const { year: yearParam, month: monthParam, team = "all" } = await searchParams;

  const now = new Date();
  const currentYear = now.getFullYear();

  const [invoiceDates, expenseDates, teams] = await Promise.all([
    prisma.invoice.findMany({ select: { date: true } }),
    prisma.expense.findMany({ select: { date: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  const years = Array.from(
    new Set([
      currentYear,
      ...invoiceDates.map((i) => i.date.getFullYear()),
      ...expenseDates.map((e) => e.date.getFullYear()),
    ])
  ).sort((a, b) => b - a);

  const year = yearParam && years.includes(Number(yearParam)) ? Number(yearParam) : currentYear;
  const month = monthParam ? Number(monthParam) : null;

  const { months, monthsElapsed } = await computeAnnualReport(year, team);
  const selectedMonths = month ? [months[month - 1]] : months;
  const { totalRevenue, totalExpenses, totalSalaries, netProfitBeforeTax, corporateTax, netProfitAfterTax } =
    summarize(selectedMonths);

  const periodLabel = month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year);

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Reports"
        dateFilter={{ years, selectedYear: year, selectedMonth: month ?? "all", basePath: "/admin/reports" }}
      />

      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Annual Report</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Summary of invoices, expenses and salaries for {periodLabel}
              {team !== "all" ? ` — ${team} team` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ReportTeamSelect teams={teams.map((t) => t.name)} selectedTeam={team} />
            <a
              href={`/admin/reports/export?${new URLSearchParams({
                year: String(year),
                ...(month ? { month: String(month) } : {}),
                ...(team !== "all" ? { team } : {}),
              }).toString()}`}
              className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2.5 flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export
            </a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminStatCard label="Total Revenue" value={formatAed(totalRevenue)} valueClassName="text-blue-700" />
          <AdminStatCard label="Total Expenses" value={formatAed(totalExpenses)} valueClassName="text-red-500" />
          <AdminStatCard label="Total Salaries" value={formatAed(totalSalaries)} valueClassName="text-orange-500" />
          <AdminStatCard
            label="Net Profit (Before Tax)"
            value={formatAed(netProfitBeforeTax)}
            valueClassName={netProfitBeforeTax >= 0 ? "text-green-600" : "text-red-500"}
          />
          <AdminStatCard label="Corporate Tax (9%)" value={formatAed(corporateTax)} valueClassName="text-purple-600" />
          <AdminStatCard
            label="Net Profit (After Tax)"
            value={formatAed(netProfitAfterTax)}
            valueClassName={netProfitAfterTax >= 0 ? "text-green-600" : "text-red-500"}
          />
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Expenses</th>
                <th className="px-4 py-3 font-medium text-right">Salaries</th>
                <th className="px-4 py-3 font-medium text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const net = m.revenue - m.expenses - m.salaries;
                const included = i + 1 <= monthsElapsed;
                const isSelected = month === i + 1;
                return (
                  <tr
                    key={MONTH_NAMES[i]}
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${
                      isSelected ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-900 font-medium">{MONTH_NAMES[i]}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{included ? formatAed(m.revenue) : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{included ? formatAed(m.expenses) : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{included ? formatAed(m.salaries) : "—"}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        !included ? "text-slate-300" : net >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {included ? formatAed(net) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold">
                <td className="px-4 py-3 text-slate-900">{month ? MONTH_NAMES[month - 1] : "Total"}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(totalExpenses)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(totalSalaries)}</td>
                <td className={`px-4 py-3 text-right ${netProfitBeforeTax >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatAed(netProfitBeforeTax)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Corporate tax is calculated at 9% of net profit before tax (no tax applied on a loss). Salaries are
          accrued monthly for each employee starting the month they joined.
        </p>
      </div>
    </div>
  );
}
