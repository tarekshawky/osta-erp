"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QUOTE_STATUSES, STATUS_TONE, type QuoteStatus } from "@/lib/acquote/status";

export type QuoteRow = {
  id: string; number: string; version: number; status: QuoteStatus; customer: string; phone: string; emirate: string; total: number; rfq: boolean;
  bookRequested: boolean; files: number; createdAt: string; expiresAt: string; converted: boolean;
  // Which calculator it came from, and (ductwork) what the customer asked for after generating it.
  kind: string; requestType: string;
};

export const REQUEST_LABEL: Record<string, string> = { inspection: "Site inspection requested", final: "Final quotation requested", inquiry: "Project inquiry" };

export const StatusBadge = ({ status }: { status: QuoteStatus }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>{status}</span>;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dubai" });
const money = (n: number) => `AED ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const input = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm";

export function QuotesList({ rows }: { rows: QuoteRow[] }) {
  const [status, setStatus] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const counts = useMemo(() => { const c: Record<string, number> = {}; for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1; return c; }, [rows]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (status === "all" || r.status === status) && (kind === "all" || r.kind === kind) && (!from || r.createdAt.slice(0, 10) >= from) && (!to || r.createdAt.slice(0, 10) <= to) && (!term || [r.number, r.customer, r.phone].some((v) => v.toLowerCase().includes(term))));
  }, [rows, status, kind, q, from, to]);
  // Quotations that were sent to us and have not become an order yet: the ones to chase.
  const open = rows.filter((r) => !r.converted && ["Submitted", "Under Review", "Under Technical Review", "Site Inspection Required", "Revised", "Sent", "Accepted"].includes(r.status)).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([["all", "All calculators"], ["split-ac", "Split AC"], ["ac-install", "Ducted AC"], ["ductwork", "Ductwork"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${kind === k ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{label}</button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStatus("all")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status === "all" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>All <span className="opacity-70">{rows.length}</span></button>
        {QUOTE_STATUSES.filter((s) => counts[s]).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status === s ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{s} <span className="opacity-70">{counts[s]}</span></button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, customer or phone" className={`${input} w-full sm:w-72`} />
        <label className="flex items-center gap-1 text-xs text-slate-500">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} /></label>
        <label className="flex items-center gap-1 text-xs text-slate-500">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} /></label>
        <span className="ms-auto text-xs text-slate-500">{open} open, not yet an order / project</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Quotation</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Emirate</th><th className="px-3 py-2 text-right">Total (incl. VAT)</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Valid until</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2"><Link href={`/admin/self-quotes/${r.id}`} className="font-semibold text-blue-700 hover:underline">{r.number}</Link><div className="text-xs text-slate-400">v{r.version}{r.files ? ` · ${r.files} file${r.files > 1 ? "s" : ""}` : ""}</div></td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.kind === "ductwork" ? "Ductwork" : r.kind === "split-ac" ? "Split AC" : "Ducted AC"}</td>
                <td className="px-3 py-2"><div className="font-medium text-slate-900">{r.customer}</div><div className="text-xs text-slate-500">{r.phone}</div></td>
                <td className="px-3 py-2 text-slate-700">{r.emirate}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-900">{money(r.total)}{r.rfq && <div className="text-[11px] font-normal text-amber-700">+ items to be quoted</div>}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} />{r.bookRequested && !r.converted && <div className="text-[11px] font-semibold text-emerald-700">Booking requested</div>}{r.requestType && REQUEST_LABEL[r.requestType] && !r.converted && <div className="text-[11px] font-semibold text-emerald-700">{REQUEST_LABEL[r.requestType]}</div>}</td>
                <td className="px-3 py-2 text-slate-600">{fmt(r.createdAt)}</td>
                <td className="px-3 py-2 text-slate-600">{fmt(r.expiresAt)}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">{rows.length === 0 ? "No quotations yet. They appear here when a customer generates one on the website." : "Nothing matches."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
