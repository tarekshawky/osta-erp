"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { checkBacklink, deleteBacklink, saveBacklink, type BacklinkInput } from "@/app/admin/website/backlink-actions";

export type BacklinkRow = BacklinkInput & { id: string; sourceSite: string; lastCheckedAt: string; lastCheckNote: string };

const STATUS_STYLE: Record<string, string> = { ACTIVE: "bg-emerald-50 text-emerald-700", PENDING: "bg-amber-50 text-amber-700", LOST: "bg-red-50 text-red-600", REJECTED: "bg-slate-100 text-slate-500" };
const TYPES = ["dofollow", "nofollow", "sponsored", "ugc"];
const blank = (): BacklinkInput => ({ sourceUrl: "", targetUrl: "/", anchorText: "", linkType: "dofollow", status: "ACTIVE", campaign: "", notes: "", discoveredAt: new Date().toISOString().slice(0, 10) });

function Editor({ id, initial, onDone }: { id: string | null; initial: BacklinkInput; onDone: () => void }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (p: Partial<BacklinkInput>) => setV((s) => ({ ...s, ...p }));
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Page that links to you *"><input className={inputClassName} dir="ltr" placeholder="https://example.com/article" value={v.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} /></Field>
        <Field label="Your page being linked *"><input className={inputClassName} dir="ltr" placeholder="/services/ac-repair" value={v.targetUrl} onChange={(e) => set({ targetUrl: e.target.value })} /></Field>
        <Field label="Anchor text"><input className={inputClassName} value={v.anchorText} onChange={(e) => set({ anchorText: e.target.value })} /></Field>
        <Field label="Campaign"><input className={inputClassName} value={v.campaign} onChange={(e) => set({ campaign: e.target.value })} /></Field>
        <Field label="Link type"><select className={inputClassName} value={v.linkType} onChange={(e) => set({ linkType: e.target.value })}>{TYPES.map((t) => (<option key={t}>{t}</option>))}</select></Field>
        <Field label="Status"><select className={inputClassName} value={v.status} onChange={(e) => set({ status: e.target.value })}>{["ACTIVE", "PENDING", "LOST", "REJECTED"].map((t) => (<option key={t}>{t}</option>))}</select></Field>
        <Field label="Discovered"><input type="date" className={inputClassName} value={v.discoveredAt} onChange={(e) => set({ discoveredAt: e.target.value })} /></Field>
        <Field label="Notes"><input className={inputClassName} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button type="button" disabled={pending} onClick={() => startTransition(async () => { setError(null); const r = await saveBacklink(id, v); if (r.ok) { showToast("Backlink saved."); onDone(); } else setError(r.error ?? "Could not save."); })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
      </div>
    </div>
  );
}

export function BacklinksManager({ rows }: { rows: BacklinkRow[] }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [status, setStatus] = useState("ALL");
  const [campaign, setCampaign] = useState("");
  const [q, setQ] = useState("");
  const [checking, setChecking] = useState<string | null>(null);

  const campaigns = useMemo(() => [...new Set(rows.map((r) => r.campaign).filter(Boolean))], [rows]);
  const shown = rows.filter((r) => (status === "ALL" || r.status === status) && (!campaign || r.campaign === campaign) && (!q || `${r.sourceSite} ${r.sourceUrl} ${r.targetUrl} ${r.anchorText}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s: string) => rows.filter((r) => r.status === s).length;

  async function check(id: string) {
    setChecking(id);
    const r = await checkBacklink(id);
    setChecking(null);
    showToast(r.ok ? r.note ?? "Checked." : r.error ?? "Check failed.", r.ok ? "success" : "error");
    router.refresh();
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4 grid max-w-xl grid-cols-4 gap-3">
        {[["Total", rows.length], ["Active", count("ACTIVE")], ["Pending", count("PENDING")], ["Lost", count("LOST")]].map(([l, n]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xl font-bold text-slate-900">{n}</p><p className="text-xs text-slate-500">{l}</p></div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className={`${inputClassName} max-w-xs`} placeholder="Search site, URL, anchor…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputClassName} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>{["ALL", "ACTIVE", "PENDING", "LOST", "REJECTED"].map((s) => (<option key={s}>{s}</option>))}</select>
        <select className={`${inputClassName} w-auto`} value={campaign} onChange={(e) => setCampaign(e.target.value)}><option value="">All campaigns</option>{campaigns.map((c) => (<option key={c}>{c}</option>))}</select>
        <button type="button" onClick={() => setEditing("new")} className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ Add backlink</button>
      </div>

      {editing === "new" && <div className="mb-3"><Editor id={null} initial={blank()} onDone={() => { setEditing(null); router.refresh(); }} /></div>}

      <div className="flex flex-col gap-2">
        {shown.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No backlinks here yet. This list is for tracking links other sites give you; it never creates any.</p>}
        {shown.map((r) =>
          editing === r.id ? (
            <Editor key={r.id} id={r.id} initial={r} onDone={() => { setEditing(null); router.refresh(); }} />
          ) : (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-blue-600">{r.sourceSite}</a>
                  <span className="ml-2 text-xs text-slate-400">→ {r.targetUrl}</span>
                  {r.anchorText && <span className="ml-2 text-xs text-slate-500">“{r.anchorText}”</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{r.linkType}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  <button type="button" disabled={checking === r.id} onClick={() => check(r.id)} className="text-xs font-medium text-blue-600 disabled:opacity-50">{checking === r.id ? "Checking…" : "Check link"}</button>
                  <button type="button" onClick={() => setEditing(r.id)} className="text-xs font-medium text-slate-600">Edit</button>
                  <button type="button" onClick={async () => { if (!confirm("Delete this backlink record?")) return; const x = await deleteBacklink(r.id); showToast(x.ok ? "Deleted." : x.error ?? "Failed.", x.ok ? "success" : "error"); router.refresh(); }} className="text-xs text-red-600">Delete</button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Found {r.discoveredAt}{r.campaign ? ` · ${r.campaign}` : ""}{r.lastCheckedAt ? ` · checked ${r.lastCheckedAt}: ${r.lastCheckNote}` : " · never checked"}{r.notes ? ` · ${r.notes}` : ""}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
