"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { updateLead } from "@/app/admin/website/forms-actions";

export type LeadRow = { id: string; at: string; status: string; notes: string; language: string; source: string; values: { label: string; value: string }[] };
const STATUS_STYLE: Record<string, string> = { NEW: "bg-red-50 text-red-600", CONTACTED: "bg-amber-50 text-amber-700", CLOSED: "bg-emerald-50 text-emerald-700", SPAM: "bg-slate-100 text-slate-500" };

function Lead({ lead }: { lead: LeadRow }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes);
  const [pending, startTransition] = useTransition();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{lead.at} · {lead.language === "ar" ? "Arabic" : "English"}{lead.source ? ` · ${lead.source}` : ""}</span>
        <span className={`rounded-full px-2.5 py-0.5 font-medium ${STATUS_STYLE[status]}`}>{status}</span>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {lead.values.map((v) => (
          <div key={v.label} className="flex gap-2"><dt className="shrink-0 text-slate-400">{v.label}:</dt><dd className="min-w-0 whitespace-pre-line break-words font-medium text-slate-800">{v.value || "—"}</dd></div>
        ))}
      </dl>
      <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]">
        <select className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["NEW", "CONTACTED", "CLOSED", "SPAM"].map((s) => (<option key={s}>{s}</option>))}
        </select>
        <input className={inputClassName} placeholder="Internal note" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await updateLead(lead.id, status, notes); showToast(r.ok ? "Saved." : r.error ?? "Failed.", r.ok ? "success" : "error"); })} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-50">Save</button>
      </div>
    </div>
  );
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [filter, setFilter] = useState("ALL");
  const shown = filter === "ALL" ? leads : leads.filter((l) => l.status === filter);
  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", "NEW", "CONTACTED", "CLOSED", "SPAM"].map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{s === "ALL" ? "All" : s}</button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {shown.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No leads here yet.</p>}
        {shown.map((l) => (<Lead key={l.id} lead={l} />))}
      </div>
    </div>
  );
}
