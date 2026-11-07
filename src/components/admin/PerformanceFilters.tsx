"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRESETS, PRESET_LABEL } from "@/lib/performancePeriod";
import { EMIRATES } from "@/lib/performanceData";

const ORDER_STATUSES = ["Requested", "Assigned", "Accepted", "On The Way", "Arrived", "In Progress", "Done", "Cancelled", "Reschedule"];
const PAYMENT_STATUSES = [["Paid", "Paid"], ["Unpaid", "Unpaid"], ["PartiallyPaid", "Partially Paid"]];

// Every control updates the address (so reports can be bookmarked and shared) and the whole page -- KPIs, charts and tables --
// is re-read for the new filters.
export function PerformanceFilters({
  teams,
  employees,
  hide = [],
}: {
  teams: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  hide?: ("emirate" | "team")[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";

  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "preset" && value !== "custom") {
      next.delete("from");
      next.delete("to");
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900";
  const label = "text-[11px] font-medium text-slate-500";
  const preset = get("preset") || "month";

  return (
    <div className="no-print rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <label className={label}>
          Period
          <select className={`${field} mt-1`} value={preset} onChange={(e) => set("preset", e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p} value={p}>{PRESET_LABEL[p]}</option>
            ))}
          </select>
        </label>
        {preset === "custom" && (
          <>
            <label className={label}>
              From
              <input type="date" className={`${field} mt-1`} value={get("from")} onChange={(e) => set("from", e.target.value)} />
            </label>
            <label className={label}>
              To
              <input type="date" className={`${field} mt-1`} value={get("to")} onChange={(e) => set("to", e.target.value)} />
            </label>
          </>
        )}
        {!hide.includes("emirate") && (
          <label className={label}>
            Emirate
            <select className={`${field} mt-1`} value={get("emirate")} onChange={(e) => set("emirate", e.target.value)}>
              <option value="">All Emirates</option>
              {EMIRATES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </label>
        )}
        {!hide.includes("team") && (
          <label className={label}>
            Team
            <select className={`${field} mt-1`} value={get("team")} onChange={(e) => set("team", e.target.value)}>
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className={label}>
          Employee
          <select className={`${field} mt-1`} value={get("employee")} onChange={(e) => set("employee", e.target.value)}>
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Order Status
          <select className={`${field} mt-1`} value={get("status")} onChange={(e) => set("status", e.target.value)}>
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Payment Status
          <select className={`${field} mt-1`} value={get("pay")} onChange={(e) => set("pay", e.target.value)}>
            <option value="">All Payments</option>
            {PAYMENT_STATUSES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-[#1E5BD8]" checked={get("compare") === "1"} onChange={(e) => set("compare", e.target.checked ? "1" : "")} />
            Compare with previous period
          </label>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <button type="button" onClick={() => router.push(pathname)} className="font-medium text-blue-600 hover:underline">Reset filters</button>
      </div>
    </div>
  );
}
