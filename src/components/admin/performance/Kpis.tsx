import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { formatAed } from "@/lib/format";
import type { Metrics } from "@/lib/performanceData";

// Change against the previous period, as the small line under a KPI (only when "Compare" is on).
function delta(cur: number, prev: number | undefined, lowerIsBetter = false): { text: string; cls: string } | null {
  if (prev === undefined) return null;
  if (prev === 0) return cur === 0 ? { text: "No change", cls: "text-slate-500" } : { text: "New (previous period: 0)", cls: "text-slate-500" };
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.05) return { text: "No change", cls: "text-slate-500" };
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  return { text: `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}% vs previous`, cls: good ? "text-green-700" : "text-red-600" };
}

export function Kpis({ totals, previous, best }: { totals: Metrics; previous: Metrics | null; best: { emirate: string | null; team: string | null } }) {
  const p = previous ?? undefined;
  const card = (label: string, value: string, cls: string, cur: number, prev: number | undefined, note: string, lowerIsBetter = false) => {
    const d = delta(cur, prev, lowerIsBetter);
    return <AdminStatCard key={label} label={label} value={value} valueClassName={cls} hint={d ? d.text : note} hintClassName={d ? d.cls : "text-slate-500"} />;
  };
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {card("Total Orders", String(totals.orders), "text-purple-600", totals.orders, p?.orders, `${totals.completed} completed · ${totals.pending} pending · ${totals.cancelled} cancelled`)}
      {card("Total Revenue", formatAed(totals.revenue), "text-blue-700", totals.revenue, p?.revenue, `Invoiced, net of refunds · ${totals.invoices} invoices`)}
      {card("Total Collected", formatAed(totals.collected), "text-green-600", totals.collected, p?.collected, "Payments actually received")}
      {card("Outstanding Receivables", formatAed(totals.outstanding), "text-orange-600", totals.outstanding, p?.outstanding, "Invoiced − collected", true)}
      {card("Total Expenses", formatAed(totals.expenses), "text-red-500", totals.expenses, p?.expenses, "Expenses + payroll, each counted once", true)}
      {card("Net Profit", formatAed(totals.profit), totals.profit < 0 ? "text-red-600" : "text-green-600", totals.profit, p?.profit, "Revenue − expenses")}
      <AdminStatCard label="Best Performing Emirate" value={best.emirate ?? "—"} valueClassName="text-teal-600" hint="Highest net profit" />
      <AdminStatCard label="Best Performing Team" value={best.team ?? "—"} valueClassName="text-teal-600" hint="Highest net profit" />
    </div>
  );
}
