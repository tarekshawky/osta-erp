import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ReportTeamSelect } from "@/components/admin/ReportTeamSelect";
import { computeAnnualReport, summarize, MONTH_NAMES, type MonthFigures } from "@/lib/reportData";

const QUARTERS = [
  { label: "Q1", months: [0, 1, 2] },
  { label: "Q2", months: [3, 4, 5] },
  { label: "Q3", months: [6, 7, 8] },
  { label: "Q4", months: [9, 10, 11] },
];

function periodFigures(figures: MonthFigures[]) {
  const revenue = figures.reduce((s, m) => s + m.revenue, 0);
  const salaries = figures.reduce((s, m) => s + m.salaries, 0);
  const costOfServices = figures.reduce((s, m) => s + m.costOfServiceExpenses, 0) + salaries;
  const operatingExpenses = figures.reduce((s, m) => s + m.operatingExpenses, 0);
  const grossProfit = revenue - costOfServices;
  const netProfit = grossProfit - operatingExpenses;
  return { revenue, salaries, costOfServices, grossProfit, operatingExpenses, netProfit };
}

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

  const {
    totalRevenue,
    totalSalaries,
    totalCash,
    totalZiina,
    totalBankTransfer,
    costOfServices,
    grossProfit,
    operatingExpenses,
    netProfitBeforeTax,
    taxableProfit,
    corporateTax,
    netProfitAfterTax,
  } = summarize(selectedMonths);
  const paymentTotals = { cash: totalCash, ziina: totalZiina, bankTransfer: totalBankTransfer };

  const periodLabel = month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year);

  const summaryRows: { label: string; value: number; emphasis?: boolean }[] = [
    { label: "Total Revenue", value: totalRevenue },
    { label: "Salary", value: totalSalaries },
    { label: "Total Cost (Cost of Services)", value: costOfServices },
    { label: "Gross Profit", value: grossProfit, emphasis: true },
    { label: "Operating Expenses", value: operatingExpenses },
    { label: "Net Profit Before Tax", value: netProfitBeforeTax, emphasis: true },
    { label: "Taxable Profit", value: taxableProfit },
    { label: "Corporate Tax", value: corporateTax },
    { label: "Net Profit After Tax", value: netProfitAfterTax, emphasis: true },
  ];

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Reports"
        dateFilter={{ years, selectedYear: year, selectedMonth: month ?? "all", basePath: "/admin/reports" }}
      />

      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Financial Report</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Profit &amp; loss summary for {periodLabel}
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

        {/* Dashboard Cards */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminStatCard label="Total Revenue" value={formatAed(totalRevenue)} valueClassName="text-blue-700" />
          <AdminStatCard label="Gross Profit" value={formatAed(grossProfit)} valueClassName="text-teal-600" />
          <AdminStatCard label="Operating Expenses" value={formatAed(operatingExpenses)} valueClassName="text-red-500" />
          <AdminStatCard
            label="Net Profit"
            value={formatAed(netProfitBeforeTax)}
            valueClassName={netProfitBeforeTax >= 0 ? "text-green-600" : "text-red-500"}
          />
          <AdminStatCard label="Corporate Tax" value={formatAed(corporateTax)} valueClassName="text-purple-600" />
          <AdminStatCard
            label="Net Profit After Tax"
            value={formatAed(netProfitAfterTax)}
            valueClassName={netProfitAfterTax >= 0 ? "text-green-600" : "text-red-500"}
          />
        </div>

        {/* Revenue by payment method */}
        <div className="mt-6">
          <h3 className="font-semibold text-slate-900">Revenue by Payment Method — {periodLabel}</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <AdminStatCard label="Cash" value={formatAed(paymentTotals.cash)} valueClassName="text-emerald-600" />
            <AdminStatCard label="Ziina" value={formatAed(paymentTotals.ziina)} valueClassName="text-blue-700" />
            <AdminStatCard
              label="Bank Transfer"
              value={formatAed(paymentTotals.bankTransfer)}
              valueClassName="text-purple-600"
            />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Financial Summary</h3>
          <div className="mt-3 flex flex-col">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className={`flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 ${
                  row.emphasis ? "font-semibold" : ""
                }`}
              >
                <span className={row.emphasis ? "text-slate-900" : "text-slate-500"}>{row.label}</span>
                <span
                  className={
                    row.label.startsWith("Net Profit")
                      ? row.value >= 0
                        ? "text-green-600"
                        : "text-red-500"
                      : "text-slate-900"
                  }
                >
                  {formatAed(row.value)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Cost of Services includes salaries actually recorded on the Payroll page (Salary + Advance − Deduction)
            plus Materials and Transportation expenses. Operating Expenses covers the remaining expense categories
            (Vehicle, Advertising, Meals, Accommodation, Maintenance, Other). Corporate tax is 0% on taxable profit
            up to AED 375,000, and 9% on the portion above that.
          </p>
        </div>

        {/* Monthly breakdown */}
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Salary</th>
                <th className="px-4 py-3 font-medium text-right">Cost of Services</th>
                <th className="px-4 py-3 font-medium text-right">Gross Profit</th>
                <th className="px-4 py-3 font-medium text-right">Operating Expenses</th>
                <th className="px-4 py-3 font-medium text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const included = i + 1 <= monthsElapsed;
                const f = periodFigures([m]);
                const isSelected = month === i + 1;
                return (
                  <tr
                    key={MONTH_NAMES[i]}
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${
                      isSelected ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-900 font-medium">{MONTH_NAMES[i]}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{included ? formatAed(f.revenue) : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{included ? formatAed(f.salaries) : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {included ? formatAed(f.costOfServices) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {included ? formatAed(f.grossProfit) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {included ? formatAed(f.operatingExpenses) : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        !included ? "text-slate-300" : f.netProfit >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {included ? formatAed(f.netProfit) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60 font-semibold">
                <td className="px-4 py-3 text-slate-900">{month ? MONTH_NAMES[month - 1] : "Total"}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(totalSalaries)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(costOfServices)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(grossProfit)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(operatingExpenses)}</td>
                <td className={`px-4 py-3 text-right ${netProfitBeforeTax >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatAed(netProfitBeforeTax)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Quarterly breakdown */}
        {!month && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Quarter</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium text-right">Salary</th>
                  <th className="px-4 py-3 font-medium text-right">Cost of Services</th>
                  <th className="px-4 py-3 font-medium text-right">Gross Profit</th>
                  <th className="px-4 py-3 font-medium text-right">Operating Expenses</th>
                  <th className="px-4 py-3 font-medium text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {QUARTERS.map((q) => {
                  const included = q.months[0] + 1 <= monthsElapsed;
                  const f = periodFigures(q.months.map((mi) => months[mi]));
                  return (
                    <tr key={q.label} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {q.label} ({MONTH_NAMES[q.months[0]].slice(0, 3)}–{MONTH_NAMES[q.months[2]].slice(0, 3)})
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{included ? formatAed(f.revenue) : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{included ? formatAed(f.salaries) : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {included ? formatAed(f.costOfServices) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {included ? formatAed(f.grossProfit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {included ? formatAed(f.operatingExpenses) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          !included ? "text-slate-300" : f.netProfit >= 0 ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {included ? formatAed(f.netProfit) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-400">
          Salary figures reflect entries recorded on the Payroll page, not an automatic monthly accrual.
        </p>
      </div>
    </div>
  );
}
