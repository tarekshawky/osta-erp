"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PRESETS, PRESET_LABEL } from "@/lib/performancePeriod";
import { EMIRATES } from "@/lib/performanceData";
import { REPORTS, type ReportKey } from "@/lib/expenseReports";

const PAYMENTS = ["Cash", "Bank Transfer", "Credit Card"];

// The report tabs and filters. Every control updates the address, so a report can be bookmarked or shared.
export function ExpenseReportFilters({ report, teams, employees, kinds }: { report: ReportKey; teams: { id: string; name: string }[]; employees: { id: string; name: string }[]; kinds: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const [customer, setCustomer] = useState(get("customer"));
  const [order, setOrder] = useState(get("order"));

  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "preset" && value !== "custom") { next.delete("from"); next.delete("to"); }
    router.push(`${pathname}?${next.toString()}`);
  }
  function tab(k: ReportKey) {
    const next = new URLSearchParams(sp.toString());
    next.set("report", k);
    next.delete("kind");
    router.push(`${pathname}?${next.toString()}`);
  }

  const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900";
  const lab = "text-[11px] font-medium text-slate-500";
  const preset = get("preset") || "month";

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist">
        {(Object.keys(REPORTS) as ReportKey[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={report === k} onClick={() => tab(k)} className={`rounded-full px-3.5 py-1.5 text-sm ${report === k ? "bg-[#1E5BD8] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {REPORTS[k].title.replace(" Report", "")}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <label className={lab}>Period<select className={`${field} mt-1`} value={preset} onChange={(e) => set("preset", e.target.value)}>{PRESETS.map((p) => <option key={p} value={p}>{PRESET_LABEL[p]}</option>)}</select></label>
          {preset === "custom" && (
            <>
              <label className={lab}>From<input type="date" className={`${field} mt-1`} value={get("from")} onChange={(e) => set("from", e.target.value)} /></label>
              <label className={lab}>To<input type="date" className={`${field} mt-1`} value={get("to")} onChange={(e) => set("to", e.target.value)} /></label>
            </>
          )}
          <label className={lab}>Emirate<select className={`${field} mt-1`} value={get("emirate")} onChange={(e) => set("emirate", e.target.value)}><option value="">All</option>{EMIRATES.map((e) => <option key={e} value={e}>{e}</option>)}</select></label>
          <label className={lab}>Team<select className={`${field} mt-1`} value={get("team")} onChange={(e) => set("team", e.target.value)}><option value="">All</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className={lab}>{report === "customer" ? "Technician" : "Employee"}<select className={`${field} mt-1`} value={get("employee")} onChange={(e) => set("employee", e.target.value)}><option value="">All</option>{employees.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className={lab}>Payment method<select className={`${field} mt-1`} value={get("payment")} onChange={(e) => set("payment", e.target.value)}><option value="">All</option>{PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          {(report === "company" || report === "employee") && (
            <label className={lab}>Expense type<select className={`${field} mt-1`} value={get("kind")} onChange={(e) => set("kind", e.target.value)}><option value="">All</option>{kinds.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          )}
          {report === "customer" && (
            <>
              <label className={lab}>Customer<input className={`${field} mt-1`} placeholder="name or ID" value={customer} onChange={(e) => setCustomer(e.target.value)} onBlur={() => set("customer", customer)} onKeyDown={(e) => e.key === "Enter" && set("customer", customer)} /></label>
              <label className={lab}>Service order<input className={`${field} mt-1`} placeholder="ORD-…" value={order} onChange={(e) => setOrder(e.target.value)} onBlur={() => set("order", order)} onKeyDown={(e) => e.key === "Enter" && set("order", order)} /></label>
            </>
          )}
        </div>
        <button type="button" onClick={() => { setCustomer(""); setOrder(""); router.push(`${pathname}?report=${report}`); }} className="mt-3 text-xs font-medium text-blue-600 hover:underline">Reset filters</button>
      </div>
    </div>
  );
}
