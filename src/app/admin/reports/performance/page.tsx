import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { PerformanceFilters } from "@/components/admin/PerformanceFilters";
import { PrintButton } from "@/components/admin/PrintButton";
import { GroupedBarChart } from "@/components/admin/GroupedBarChart";
import { MonthlyBarChart } from "@/components/admin/MonthlyBarChart";
import { DonutChart } from "@/components/admin/DonutChart";
import { RankBars } from "@/components/admin/performance/RankBars";
import { Kpis } from "@/components/admin/performance/Kpis";
import { EmirateTable, TeamTable, parseSort, sortRows } from "@/components/admin/performance/Tables";
import { loadPerformance, parsePerfQuery, type RawParams } from "@/lib/performanceLoader";
import { COST_BUCKETS } from "@/lib/performanceData";
import { formatAed } from "@/lib/format";

export default async function PerformanceReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const q = parsePerfQuery(sp);
  const { input, current, previous, previousLabel, employees } = await loadPerformance(q);
  const qs = q.params.toString();
  const detailQuery = qs ? `?${qs}` : "";
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const eSort = parseSort(one(sp.esort), ["emirate", "orders", "completed", "pending", "cancelled", "revenue", "collected", "outstanding", "expenses", "profit", "avgInvoice"], "revenue");
  const tSort = parseSort(one(sp.tsort), ["name", "assignedEmirate", "orders", "completed", "cancelled", "revenue", "collected", "outstanding", "expenses", "profit", "avgInvoice", "expensePct"], "revenue");
  const emirates = sortRows(current.emirates, eSort);
  const teams = sortRows(current.teams, tSort);
  const scoped = Boolean(q.filters.emirate);
  const shared = current.sharedExpenses + current.unallocatedExpenses;
  const exportHref = `/admin/reports/performance/export?${qs}`;

  const byEmirate = (k: "revenue" | "orders") => current.emirates.map((e) => ({ label: e.emirate, value: e[k], href: `/admin/reports/performance/emirate/${encodeURIComponent(e.emirate)}${detailQuery}` }));
  const byTeam = (k: "revenue" | "expenses" | "profit") => current.teams.filter((t) => t.teamId).map((t) => ({ label: t.name, value: t[k], href: `/admin/reports/performance/team/${t.teamId}${detailQuery}` }));

  return (
    <div className="pb-10 print-area">
      <AdminTopBar title="Performance Report" hideMonth />
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Performance by Emirate &amp; Team</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {q.period.label}
              {previous && <span> · compared with {previousLabel}</span>}
              {scoped && <span> · {q.filters.emirate} only</span>}
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <a href={exportHref} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Export to Excel</a>
            <PrintButton />
          </div>
        </div>

        <PerformanceFilters teams={input.teams} employees={employees} />

        <Kpis totals={current.totals} previous={previous?.totals ?? null} best={current.best} />

        <div className="grid gap-4 lg:grid-cols-2">
          <RankBars title="Revenue by Emirate" rows={byEmirate("revenue")} tone="blue" />
          <RankBars title="Orders by Emirate" rows={byEmirate("orders")} unit="orders" tone="purple" />
          <RankBars title="Revenue by Team" rows={byTeam("revenue")} tone="blue" />
          <RankBars title="Expenses by Team" rows={byTeam("expenses")} tone="orange" />
          <RankBars title="Net Profit by Team" rows={byTeam("profit")} tone="green" />
          <DonutChart title="Expenses by type" slices={current.buckets.length ? current.buckets : COST_BUCKETS.map((b) => ({ label: b, value: 0 }))} unit="AED" />
          <GroupedBarChart
            title="Monthly Revenue vs Expenses"
            points={current.monthly.map((m) => ({ label: m.label, a: m.revenue, b: m.expenses }))}
            series={[{ name: "Revenue", color: "#1E5BD8" }, { name: "Expenses", color: "#C2560C" }]}
          />
          <MonthlyBarChart title="Order Volume Trend" points={current.monthly.map((m) => ({ label: m.label, value: m.orders }))} tone="purple" unit="orders" subtitle="By month" />
        </div>

        <section>
          <h3 className="mb-2 text-base font-semibold text-slate-900">Emirate Comparison</h3>
          <EmirateTable rows={emirates} sort={eSort} params={q.params} shared={scoped ? 0 : shared} total={current.totals} detailQuery={detailQuery} />
        </section>

        <section>
          <h3 className="mb-2 text-base font-semibold text-slate-900">Team Comparison</h3>
          <TeamTable rows={teams} sort={tSort} params={q.params} detailQuery={detailQuery} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">How these figures are calculated</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><b>Revenue</b> = invoiced amount (net of refunds) of invoices dated in the period. Most invoices are created directly, not from a service order, so revenue is taken from invoices, not only from orders.</li>
            <li><b>Collected</b> = money actually received (paid invoices plus the part received on part-paid ones). <b>Outstanding</b> = revenue − collected. An unpaid invoice is never counted as collected.</li>
            <li><b>Emirate</b> = the customer&apos;s emirate; <b>Team</b> = the team that did the work. Orders are counted by order date; <i>Completed</i> = Done, <i>Cancelled</i> = Cancelled, <i>Pending</i> = every other status.</li>
            <li><b>Expenses</b> = expenses (net of refunds) plus payroll (Salary + Advance − Deduction), each counted once. A team named after an emirate is an operational team: its costs are spread over the emirates in proportion to its revenue there. Other teams (e.g. Admin) and expenses with no team are shown as shared / head-office costs, so no cost is counted twice.</li>
            <li><b>Avg Invoice</b> = revenue ÷ number of invoices. <b>Expense %</b> = expenses ÷ revenue. <b>Net Profit</b> = revenue − expenses.</li>
          </ul>
          {current.unallocatedExpenses > 0 && !scoped && (
            <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-orange-700">
              {formatAed(current.unallocatedExpenses)} of operational-team costs have no revenue in this period to spread them over; they are included in the shared line and the totals.
            </p>
          )}
          <p className="mt-3 no-print">
            <Link href="/admin/reports" className="font-medium text-blue-600 hover:underline">← Back to Reports</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
