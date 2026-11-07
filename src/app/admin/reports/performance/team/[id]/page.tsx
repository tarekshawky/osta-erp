import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { PerformanceFilters } from "@/components/admin/PerformanceFilters";
import { PrintButton } from "@/components/admin/PrintButton";
import { GroupedBarChart } from "@/components/admin/GroupedBarChart";
import { DonutChart } from "@/components/admin/DonutChart";
import { RankBars } from "@/components/admin/performance/RankBars";
import { Kpis } from "@/components/admin/performance/Kpis";
import { CostsList, InvoicesList, OrdersList } from "@/components/admin/performance/Lists";
import { COST_BUCKETS, filterRows } from "@/lib/performanceData";
import { loadPerformance, parsePerfQuery, type RawParams } from "@/lib/performanceLoader";
import { formatAed } from "@/lib/format";

export default async function TeamPerformancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RawParams> }) {
  const { id } = await params;
  const q = parsePerfQuery(await searchParams, { teamId: id });
  const { input, current, previous, previousLabel, employees } = await loadPerformance(q);
  const team = input.teams.find((t) => t.id === id);
  if (!team) notFound();
  const tn = (tid: string | null) => (tid === team.id ? team.name : (input.teams.find((t) => t.id === tid)?.name ?? "No team"));
  const rows = filterRows(input, q.filters);
  const row = current.teams.find((t) => t.teamId === id);
  const back = new URLSearchParams(q.params);
  back.delete("team");
  const exportQs = new URLSearchParams(q.params);
  exportQs.set("team", id);
  const buckets = COST_BUCKETS.map((b) => ({ label: b, value: current.buckets.find((x) => x.label === b)?.value ?? 0 }));

  return (
    <div className="pb-10 print-area">
      <AdminTopBar title={`${team.name} — Team Performance`} hideMonth />
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/admin/reports/performance${back.toString() ? `?${back}` : ""}`} className="no-print text-sm font-medium text-blue-600 hover:underline">← All teams</Link>
            <h2 className="text-2xl font-bold text-slate-900">{team.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {row?.assignedEmirate ? `Emirate: ${row.assignedEmirate}` : "Shared / head-office team"} · {q.period.label}
              {previous && <span> · compared with {previousLabel}</span>}
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <a href={`/admin/reports/performance/export?${exportQs}`} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Export {team.name} to Excel</a>
            <PrintButton />
          </div>
        </div>

        <PerformanceFilters teams={input.teams} employees={employees} hide={["team"]} />
        <Kpis totals={current.totals} previous={previous?.totals ?? null} best={{ emirate: current.best.emirate, team: team.name }} />

        <div className="grid gap-4 lg:grid-cols-2">
          <DonutChart title="Expenses by type" slices={buckets} unit="AED" />
          <GroupedBarChart title="Monthly Revenue vs Expenses" points={current.monthly.map((m) => ({ label: m.label, a: m.revenue, b: m.expenses }))} series={[{ name: "Revenue", color: "#1E5BD8" }, { name: "Expenses", color: "#C2560C" }]} />
          <RankBars title="Revenue by customer emirate" rows={current.emirates.map((e) => ({ label: e.emirate, value: e.revenue }))} tone="blue" />
        </div>

        <section>
          <h3 className="mb-2 text-base font-semibold text-slate-900">Expenses breakdown</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr><th className="px-3 py-3 text-left font-medium">Type</th><th className="px-3 py-3 text-right font-medium">Amount</th><th className="px-3 py-3 text-right font-medium">% of team expenses</th></tr></thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.label} className="border-b border-slate-100">
                    <td className="px-3 py-2.5">{b.label}</td><td className="px-3 py-2.5 text-right">{formatAed(b.value)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{current.totals.expenses > 0 ? ((b.value / current.totals.expenses) * 100).toFixed(1) : "0.0"}%</td>
                  </tr>
                ))}
                <tr className="bg-[#E6EEFD] font-semibold"><td className="px-3 py-2.5">Total</td><td className="px-3 py-2.5 text-right">{formatAed(current.totals.expenses)}</td><td className="px-3 py-2.5 text-right">100%</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <CostsList rows={rows.costs} teamName={tn} />
        <OrdersList rows={rows.orders} teamName={tn} />
        <InvoicesList rows={rows.invoices} teamName={tn} />
      </div>
    </div>
  );
}
