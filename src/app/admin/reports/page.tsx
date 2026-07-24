import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ReportYearSelect } from "@/components/admin/ReportYearSelect";

const CORPORATE_TAX_RATE = 0.09;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [invoices, expenses, employees] = await Promise.all([
    prisma.invoice.findMany({ select: { date: true, amount: true, refundedAmount: true } }),
    prisma.expense.findMany({ select: { date: true, amount: true, refundedAmount: true } }),
    prisma.employee.findMany({ select: { monthlySalary: true, createdAt: true } }),
  ]);

  const years = Array.from(
    new Set([
      currentYear,
      ...invoices.map((i) => i.date.getFullYear()),
      ...expenses.map((e) => e.date.getFullYear()),
    ])
  ).sort((a, b) => b - a);

  const year = yearParam && years.includes(Number(yearParam)) ? Number(yearParam) : currentYear;
  const monthsElapsed = year < currentYear ? 12 : year > currentYear ? 0 : currentMonth;

  const months = Array.from({ length: 12 }, () => ({ revenue: 0, expenses: 0, salaries: 0 }));

  for (const inv of invoices) {
    if (inv.date.getFullYear() !== year) continue;
    months[inv.date.getMonth()].revenue += inv.amount - inv.refundedAmount;
  }

  for (const exp of expenses) {
    if (exp.date.getFullYear() !== year) continue;
    months[exp.date.getMonth()].expenses += exp.amount - exp.refundedAmount;
  }

  for (let m = 0; m < 12; m++) {
    if (m + 1 > monthsElapsed) continue;
    const monthEnd = new Date(Date.UTC(year, m + 1, 1));
    for (const emp of employees) {
      if (emp.createdAt < monthEnd) {
        months[m].salaries += emp.monthlySalary;
      }
    }
  }

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
  const totalSalaries = months.reduce((s, m) => s + m.salaries, 0);
  const netProfitBeforeTax = totalRevenue - totalExpenses - totalSalaries;
  const corporateTax = Math.max(0, netProfitBeforeTax) * CORPORATE_TAX_RATE;
  const netProfitAfterTax = netProfitBeforeTax - corporateTax;

  return (
    <div className="pb-10">
      <AdminTopBar title="Reports" />

      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Annual Report</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Full-year summary of invoices, expenses and salaries for {year}
            </p>
          </div>
          <ReportYearSelect years={years} selectedYear={year} />
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
                return (
                  <tr key={MONTH_NAMES[i]} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
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
                <td className="px-4 py-3 text-slate-900">Total</td>
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
