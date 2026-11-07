"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import * as actions from "@/app/admin/contracts/actions";
import type { CResult } from "@/app/admin/contracts/actions";
import type { Clause } from "@/lib/contracts/clauses";
import type { TermsRow } from "@/lib/contracts/terms";

const card = "rounded-xl border border-slate-200 bg-white p-4";
const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const primary = "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40";
const TONE: Record<string, string> = { draft: "bg-amber-100 text-amber-800", published: "bg-emerald-100 text-emerald-800", archived: "bg-zinc-200 text-zinc-600" };
const when = (iso: Date | string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export function TermsEditor({ groups, versions, groupKey }: { groups: { key: string; name: string }[]; versions: TermsRow[]; groupKey: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(versions.find((v) => v.status === "draft")?.id ?? null);
  const [edits, setEdits] = useState<Record<string, { clauses: Clause[]; note: string }>>({});

  const run = (fn: () => Promise<CResult>, ok: string, after?: (r: CResult) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return showToast(r.error ?? "Something went wrong.", "error");
      showToast(ok);
      after?.(r);
      router.refresh();
    });

  const cur = (v: TermsRow) => edits[v.id] ?? { clauses: v.clauses, note: v.note };
  const patch = (v: TermsRow, next: Partial<{ clauses: Clause[]; note: string }>) => setEdits({ ...edits, [v.id]: { ...cur(v), ...next } });
  const published = versions.find((v) => v.status === "published");
  const hasDraft = versions.some((v) => v.status === "draft");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-slate-600">Terms for</label>
        <select className={`${input} max-w-md`} value={groupKey} onChange={(e) => router.push(`/admin/contracts/terms${e.target.value ? `?group=${e.target.value}` : ""}`)}>
          {groups.map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
        </select>
        {!hasDraft && <button type="button" className={primary} disabled={pending} onClick={() => run(() => actions.createTermsDraft(groupKey, published?.clauses ?? versions[0]?.clauses ?? [], published ? `Based on version ${published.version}` : ""), "New draft version created.", (r) => r.id && setOpenId(r.id))}>+ New version{published ? ` (from v${published.version})` : ""}</button>}
        {groupKey && !published && <span className="text-xs text-slate-500">No set of its own yet: the default terms apply to this page.</span>}
      </div>

      {versions.map((v) => {
        const e = cur(v);
        const editable = v.status === "draft";
        const isOpen = openId === v.id;
        return (
          <div key={v.id} className={card}>
            <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpenId(isOpen ? null : v.id)}>
              <span className="flex items-center gap-2"><b className="text-slate-900">Version {v.version}</b><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[v.status]}`}>{v.status}</span><span className="text-xs text-slate-500">{v.clauses.length} clauses{v.publishedAt ? ` · published ${when(v.publishedAt)}` : ` · created ${when(v.createdAt)} by ${v.createdByName || "—"}`}</span></span>
              <span className="text-xs text-slate-400">{isOpen ? "Hide" : "Show"}</span>
            </button>
            {v.note && <p className="mt-1 text-xs text-slate-500">{v.note}</p>}
            {isOpen && (
              <div className="mt-3 flex flex-col gap-3">
                {editable && <input className={input} placeholder="What changed in this version (optional)" value={e.note} onChange={(ev) => patch(v, { note: ev.target.value })} />}
                {e.clauses.map((c, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3">
                    <div className="mb-2 flex items-center justify-between"><b className="text-sm text-slate-700">{i + 1}. {c.titleEn || "New clause"}</b>
                      {editable && <span className="flex gap-1">
                        <button type="button" className={btn} disabled={i === 0} onClick={() => { const a = [...e.clauses]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; patch(v, { clauses: a }); }}>↑</button>
                        <button type="button" className={btn} disabled={i === e.clauses.length - 1} onClick={() => { const a = [...e.clauses]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; patch(v, { clauses: a }); }}>↓</button>
                        <button type="button" className={btn} onClick={() => patch(v, { clauses: e.clauses.filter((_, j) => j !== i) })}>Remove</button></span>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={input} disabled={!editable} placeholder="Title (English)" value={c.titleEn} onChange={(ev) => patch(v, { clauses: e.clauses.map((x, j) => (j === i ? { ...x, titleEn: ev.target.value } : x)) })} />
                      <input className={input} dir="rtl" disabled={!editable} placeholder="العنوان (عربي)" value={c.titleAr} onChange={(ev) => patch(v, { clauses: e.clauses.map((x, j) => (j === i ? { ...x, titleAr: ev.target.value } : x)) })} />
                      <textarea className={input} rows={6} disabled={!editable} placeholder="Text (English). A blank line starts a new paragraph; a line starting with '- ' is a bullet." value={c.bodyEn} onChange={(ev) => patch(v, { clauses: e.clauses.map((x, j) => (j === i ? { ...x, bodyEn: ev.target.value } : x)) })} />
                      <textarea className={input} dir="rtl" rows={6} disabled={!editable} placeholder="النص (عربي)" value={c.bodyAr} onChange={(ev) => patch(v, { clauses: e.clauses.map((x, j) => (j === i ? { ...x, bodyAr: ev.target.value } : x)) })} />
                    </div>
                  </div>
                ))}
                {editable && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => patch(v, { clauses: [...e.clauses, { key: `clause-${Date.now().toString(36)}`, titleEn: "", titleAr: "", bodyEn: "", bodyAr: "" }] })}>+ Add clause</button>
                    <button type="button" className={primary} disabled={pending} onClick={() => run(() => actions.saveTermsDraft(v.id, e.clauses, e.note), "Draft saved.")}>Save draft</button>
                    <button type="button" className={primary} disabled={pending} onClick={() => { if (window.confirm(`Publish version ${v.version}? New agreements will use it from now on. Existing agreements keep the text they accepted.`)) run(async () => { const s = await actions.saveTermsDraft(v.id, e.clauses, e.note); return s.ok ? actions.publishTerms(v.id) : s; }, "Published."); }}>Save &amp; publish</button>
                    <button type="button" className={btn} disabled={pending} onClick={() => { if (window.confirm("Delete this draft?")) run(() => actions.deleteTermsDraft(v.id), "Draft deleted."); }}>Delete draft</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
