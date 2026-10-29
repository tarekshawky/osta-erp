"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { changeApplicationStatus } from "@/app/admin/jobs/actions";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABEL, EMIRATE_LABEL, type EmirateKey } from "@/lib/jobs/constants";
import { ApplicationStatusBadge } from "@/components/jobs/ui";

export type AppRow = {
  id: string; code: string; isRead: boolean; status: string; createdAt: string; photoIds: string[];
  name: string; phone: string; whatsapp: string | null; skills: string[]; emirate: string | null; area: string | null;
  jobId: string; jobNumber: number; jobTitle: string; jobEmirate: string;
};

export function ApplicationsTable({ rows, skillLabels }: { rows: AppRow[]; skillLabels: Record<string, string> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const all = rows.length > 0 && sel.size === rows.length;
  const toggle = (id: string) => setSel((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div>
      {sel.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-blue-800">{sel.size} selected</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" aria-label="New status">
            <option value="">Change status to…</option>
            {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
          </select>
          <button type="button" disabled={!status || pending} onClick={() => startTransition(async () => { const r = await changeApplicationStatus([...sel], status); if (r.ok) { showToast(`${sel.size} application(s) updated`); setSel(new Set()); setStatus(""); router.refresh(); } else showToast(r.error ?? "Could not update.", "error"); })} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Apply</button>
          <button type="button" onClick={() => setSel(new Set())} className="text-xs text-slate-500">Clear</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3"><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
              <th className="px-3 py-3">Code</th><th className="px-3 py-3">Applicant</th><th className="px-3 py-3">Job</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">WhatsApp</th>
              <th className="px-3 py-3">Skills</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Photos</th><th className="px-3 py-3">Applied</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className={`align-top hover:bg-slate-50 ${r.isRead ? "" : "font-semibold"}`}>
                <td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${r.code}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className="px-3 py-3"><Link href={`/admin/jobs/applications/${r.id}`} className="text-blue-600">{r.code}</Link></td>
                <td className="px-3 py-3">{r.name}</td>
                <td className="px-3 py-3 font-normal text-slate-600"><Link href={`/admin/jobs/${r.jobId}`} className="hover:text-blue-700">#{r.jobNumber} {r.jobTitle}</Link><div className="text-xs text-slate-400">{EMIRATE_LABEL[r.jobEmirate as EmirateKey]?.en}</div></td>
                <td className="px-3 py-3 font-normal text-slate-600 whitespace-nowrap" dir="ltr">{r.phone}</td>
                <td className="px-3 py-3 font-normal text-slate-600 whitespace-nowrap" dir="ltr">{r.whatsapp ?? "—"}</td>
                <td className="px-3 py-3 font-normal text-slate-600"><div className="flex max-w-44 flex-wrap gap-1">{r.skills.slice(0, 3).map((s) => <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">{skillLabels[s] ?? s}</span>)}{r.skills.length > 3 && <span className="text-[11px] text-slate-400">+{r.skills.length - 3}</span>}</div></td>
                <td className="px-3 py-3 font-normal text-slate-600">{[r.emirate ? EMIRATE_LABEL[r.emirate as EmirateKey]?.en : null, r.area].filter(Boolean).join(" – ") || "—"}</td>
                <td className="px-3 py-3 font-normal">
                  <div className="flex items-center gap-1.5">
                    {r.photoIds[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/admin/jobs/photos/${r.photoIds[0]}?size=thumb`} alt="" width={36} height={36} className="h-9 w-9 rounded object-cover" loading="lazy" />
                    )}
                    <span className="text-slate-600">{r.photoIds.length}</span>
                  </div>
                </td>
                <td className="px-3 py-3 font-normal text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                <td className="px-3 py-3 font-normal"><ApplicationStatusBadge status={r.status} /></td>
                <td className="px-3 py-3 font-normal"><div className="flex gap-2 text-xs"><Link href={`/admin/jobs/applications/${r.id}`} className="text-blue-600">Open</Link><a href={`tel:${r.phone}`} className="text-slate-600">Call</a></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
