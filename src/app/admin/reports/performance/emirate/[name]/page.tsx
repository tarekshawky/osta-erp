import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { PerformanceFilters } from "@/components/admin/PerformanceFilters";
import { PrintButton } from "@/components/admin/PrintButton";
import { GroupedBarChart } from "@/components/admin/GroupedBarChart";
import { DonutChart } from "@/components/admin/DonutChart";
import { RankBars } from "@/components/admin/performance/RankBars";
import { Kpis } from "@/components/admin/performance/Kpis";
import { TeamTable, parseSort, sortRows } from "@/components/admin/performance/Tables";
import { InvoicesList, OrdersList } from "@/components/admin/performance/Lists";
import { filterRows, EMIRATES, OTHER_EMIRATE } from "@/lib/performanceData";
import { loadPerformance, parsePerfQuery, type RawParams } from "@/lib/performanceLoader";

export default async function EmiratePerformancePage({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<RawParams> }) {
  const name = decodeURIComponent((await params).name);
  if (!([...EMIRATES, OTHER_EMIRATE] as string[]).includes(name)) notFound();
  const sp = await searchParams;
  const q = parsePerfQuery(sp, { emirate: name });
  const { input, current, previous, previousLabel, employees } = await loadPerformance(q);
  const teamName = new Map(input.teams.map((t) => [t.id, t.name]));
  const tn = (id: string | null) => (id ? (teamName.get(id) ?? "") : "No team");
  const rows = filterRows(input, q.filters);
  const tSort = parseSort(Array.isArray(sp.tsort) ? sp.tsort[0] : sp.tsort, ["name", "orders", "completed", "cancelled", "revenue", "collected", "outstanding", "expenses", "profit", "avgInvoice", "expensePct"], "revenue");
  const back = new URLSearchParams(q.params);
  back.delete("emirate");
  const exportQs = new URLSearchParams(q.params);
  exportQs.set("emirate", name);

  return (
    <div className="pb-10 print-area">
      <AdminTopBar title={`${name} — Performance`} hideMonth />
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/admin/reports/performance${back.toString() ? `?${back}` : ""}`} className="no-print text-sm font-medium text-blue-600 hover:underline">← All emirates</Link>
            <h2 className="text-2xl font-bold text-slate-900">{name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{q.period.label}{previous && <span> · compared with {previousLabel}</span>}</p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <a href={`/admin/reports/performance/export?${exportQs}`} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Export {name} to Excel</a>
            <PrintButton />
          </div>
        </div>

        <PerformanceFilters teams={input.teams} employees={employees} hide={["emirate"]} />
        <Kpis totals={current.totals} previous={previous?.totals ?? null} best={{ emirate: name, team: current.best.team }} />

        <div className="grid gap-4 lg:grid-cols-2">
          <RankBars title="Revenue by Team" rows={current.teams.filter((t) => t.teamId).map((t) => ({ label: t.name, value: t.revenue }))} tone="blue" />
          <RankBars title="Net Profit by Team" rows={current.teams.filter((t) => t.teamId).map((t) => ({ label: t.name, value: t.profit }))} tone="green" />
          <DonutChart title="Expenses allocated to this emirate, by type" slices={current.buckets} unit="AED" />
          <GroupedBarChart title="Monthly Revenue vs Expenses" points={current.monthly.map((m) => ({ label: m.label, a: m.revenue, b: m.expenses }))} series={[{ name: "Revenue", color: "#1E5BD8" }, { name: "Expenses", color: "#C2560C" }]} />
        </div>

        <section>
          <h3 className="mb-2 text-base font-semibold text-slate-900">Teams working in {name}</h3>
          <TeamTable rows={sortRows(current.teams.filter((t) => t.orders > 0 || t.invoices > 0 || t.expenses > 0), tSort)} sort={tSort} params={q.params} detailQuery={q.params.toString() ? `?${back}` : ""} />
          <p className="mt-2 text-xs text-slate-500">Costs are recorded per team, not per emirate, so each team&apos;s costs are shared over the emirates it works in by revenue. Head-office costs are not allocated to any emirate.</p>
        </section>

        <OrdersList rows={rows.orders} teamName={tn} />
        <InvoicesList rows={rows.invoices} teamName={tn} />
      </div>
    </div>
  );
}
