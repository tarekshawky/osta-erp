import Link from "next/link";
import { formatAed } from "@/lib/format";
import type { EmirateRow, Metrics, TeamRow } from "@/lib/performanceData";

const money = (n: number) => formatAed(n).replace("AED ", "");
const profitClass = (n: number) => (n < 0 ? "text-red-600" : n > 0 ? "text-green-700" : "text-slate-900");

export type SortState = { key: string; dir: "asc" | "desc" };
export function parseSort(v: string | undefined, allowed: string[], fallback: string): SortState {
  const [key, dir] = (v ?? "").split(":");
  return { key: allowed.includes(key) ? key : fallback, dir: dir === "asc" ? "asc" : "desc" };
}
export function sortRows<T extends Record<string, unknown>>(rows: T[], s: SortState): T[] {
  return [...rows].sort((a, b) => {
    const x = a[s.key];
    const y = b[s.key];
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
    return s.dir === "asc" ? cmp : -cmp;
  });
}

function Th({ label, k, sort, param, params, right = true }: { label: string; k: string; sort: SortState; param: string; params: URLSearchParams; right?: boolean }) {
  const next = new URLSearchParams(params.toString());
  next.set(param, `${k}:${sort.key === k && sort.dir === "desc" ? "asc" : "desc"}`);
  const active = sort.key === k;
  return (
    <th className={`whitespace-nowrap px-3 py-3 font-medium ${right ? "text-right" : "text-left"}`}>
      <Link href={`?${next.toString()}`} className="inline-flex items-center gap-1 hover:underline">
        {label}
        <span aria-hidden className={active ? "opacity-100" : "opacity-30"}>{active && sort.dir === "asc" ? "▲" : "▼"}</span>
      </Link>
    </th>
  );
}

const numCell = "whitespace-nowrap px-3 py-3 text-right tabular-nums";

export function EmirateTable({
  rows, sort, params, shared, total, detailQuery,
}: { rows: EmirateRow[]; sort: SortState; params: URLSearchParams; shared: number; total: Metrics; detailQuery: string }) {
  const th = (label: string, k: string, right = true) => <Th label={label} k={k} sort={sort} param="esort" params={params} right={right} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {th("Emirate", "emirate", false)}{th("Orders", "orders")}{th("Completed", "completed")}{th("Pending", "pending")}{th("Cancelled", "cancelled")}
            {th("Revenue", "revenue")}{th("Collected", "collected")}{th("Outstanding", "outstanding")}{th("Expenses", "expenses")}{th("Net Profit", "profit")}{th("Avg Invoice", "avgInvoice")}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.emirate} className="border-b border-slate-100">
              <td className="whitespace-nowrap px-3 py-3 font-medium text-blue-600">
                <Link href={`/admin/reports/performance/emirate/${encodeURIComponent(r.emirate)}${detailQuery}`}>{r.emirate}</Link>
              </td>
              <td className={numCell}>{r.orders}</td><td className={numCell}>{r.completed}</td><td className={numCell}>{r.pending}</td><td className={numCell}>{r.cancelled}</td>
              <td className={`${numCell} font-medium`}>{money(r.revenue)}</td><td className={numCell}>{money(r.collected)}</td>
              <td className={`${numCell} ${r.outstanding > 0 ? "text-orange-600" : ""}`}>{money(r.outstanding)}</td>
              <td className={numCell}>{money(r.expenses)}</td>
              <td className={`${numCell} font-semibold ${profitClass(r.profit)}`}>{money(r.profit)}</td>
              <td className={numCell}>{money(r.avgInvoice)}</td>
            </tr>
          ))}
          {shared > 0 && (
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <td className="px-3 py-3 italic" colSpan={8}>Shared / head-office expenses (not in any emirate)</td>
              <td className={numCell}>{money(shared)}</td>
              <td className={`${numCell} font-semibold ${profitClass(-shared)}`}>{money(-shared)}</td>
              <td />
            </tr>
          )}
          <tr className="bg-[#E6EEFD] font-semibold text-slate-900">
            <td className="px-3 py-3">Company total</td>
            <td className={numCell}>{total.orders}</td><td className={numCell}>{total.completed}</td><td className={numCell}>{total.pending}</td><td className={numCell}>{total.cancelled}</td>
            <td className={numCell}>{money(total.revenue)}</td><td className={numCell}>{money(total.collected)}</td><td className={numCell}>{money(total.outstanding)}</td>
            <td className={numCell}>{money(total.expenses)}</td><td className={`${numCell} ${profitClass(total.profit)}`}>{money(total.profit)}</td><td className={numCell}>{money(total.avgInvoice)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function TeamTable({ rows, sort, params, detailQuery }: { rows: TeamRow[]; sort: SortState; params: URLSearchParams; detailQuery: string }) {
  const th = (label: string, k: string, right = true) => <Th label={label} k={k} sort={sort} param="tsort" params={params} right={right} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {th("Team", "name", false)}{th("Emirate", "assignedEmirate", false)}{th("Orders", "orders")}{th("Completed", "completed")}{th("Cancelled", "cancelled")}
            {th("Revenue", "revenue")}{th("Collected", "collected")}{th("Outstanding", "outstanding")}{th("Expenses", "expenses")}{th("Net Profit", "profit")}{th("Avg Invoice", "avgInvoice")}{th("Expense %", "expensePct")}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teamId ?? "none"} className="border-b border-slate-100">
              <td className="whitespace-nowrap px-3 py-3 font-medium text-blue-600">
                {r.teamId ? <Link href={`/admin/reports/performance/team/${r.teamId}${detailQuery}`}>{r.name}</Link> : <span className="text-slate-600">{r.name}</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.assignedEmirate ?? <span className="text-slate-400">Shared / head office</span>}</td>
              <td className={numCell}>{r.orders}</td><td className={numCell}>{r.completed}</td><td className={numCell}>{r.cancelled}</td>
              <td className={`${numCell} font-medium`}>{money(r.revenue)}</td><td className={numCell}>{money(r.collected)}</td>
              <td className={`${numCell} ${r.outstanding > 0 ? "text-orange-600" : ""}`}>{money(r.outstanding)}</td>
              <td className={numCell}>{money(r.expenses)}</td>
              <td className={`${numCell} font-semibold ${profitClass(r.profit)}`}>{money(r.profit)}</td>
              <td className={numCell}>{money(r.avgInvoice)}</td><td className={numCell}>{r.expensePct.toFixed(1)}%</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400">No team activity in this period.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
