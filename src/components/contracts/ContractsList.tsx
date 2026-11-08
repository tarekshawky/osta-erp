"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STATUS_LABEL, TABS, type DisplayStatus, type TabKey } from "@/lib/contracts/workflow";

export type ContractRow = {
  id: string; number: string; requestNumber: string; version: number; status: DisplayStatus; tab: Exclude<TabKey, "all">; customer: string; phone: string;
  packageName: string; total: number; quote: boolean; createdAt: string; expiryDate: string | null; paid: boolean;
};

export const STATUS_TONE: Record<DisplayStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700", PENDING_APPROVAL: "bg-amber-100 text-amber-800", CHANGES_REQUESTED: "bg-orange-100 text-orange-800", AWAITING_PAYMENT: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-emerald-100 text-emerald-800", SUSPENDED: "bg-orange-100 text-orange-800", EXPIRED: "bg-zinc-200 text-zinc-700", CANCELLED: "bg-zinc-200 text-zinc-600", REJECTED: "bg-red-100 text-red-700",
};

export const StatusBadge = ({ status }: { status: DisplayStatus }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>{STATUS_LABEL[status].en}</span>;

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dubai" }) : "—");
const money = (n: number) => `AED ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function ContractsList({ rows, renewalWindowDays }: { rows: ContractRow[]; renewalWindowDays: number }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [now] = useState(() => Date.now());
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.tab] = (c[r.tab] ?? 0) + 1;
    return c;
  }, [rows]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === "all" || r.tab === tab) && (!term || [r.number, r.requestNumber, r.customer, r.phone, r.packageName].some((v) => v.toLowerCase().includes(term))));
  }, [rows, tab, q]);
  const soon = (r: ContractRow) => r.status === "ACTIVE" && r.expiryDate != null && new Date(r.expiryDate).getTime() - now < renewalWindowDays * 864e5;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tab === t.key ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
            {t.label} <span className={tab === t.key ? "text-blue-100" : "text-slate-400"}>{counts[t.key] ?? 0}</span>
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, customer, phone, package" className="ms-auto w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm sm:w-72" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">Agreement</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Package</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Expires</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2"><Link href={`/admin/contracts/${r.id}`} className="font-semibold text-blue-700 hover:underline">{r.number}</Link><div className="text-xs text-slate-400">{r.requestNumber}{r.version > 1 ? ` · v${r.version}` : ""}</div></td>
                <td className="px-3 py-2"><div className="font-medium text-slate-900">{r.customer}</div><div className="text-xs text-slate-500">{r.phone}</div></td>
                <td className="px-3 py-2 text-slate-700">{r.packageName}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-900">{r.quote ? <span className="text-xs text-amber-700">To be quoted</span> : money(r.total)}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} />{r.status === "ACTIVE" && !r.paid ? <div className="text-[11px] text-amber-700">Payment arrangement</div> : null}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(r.expiryDate)}{soon(r) ? <div className="text-[11px] font-semibold text-orange-600">Renewal due</div> : null}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-500">{rows.length === 0 ? "No agreements yet. They appear here when a customer confirms a package." : "Nothing matches."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
