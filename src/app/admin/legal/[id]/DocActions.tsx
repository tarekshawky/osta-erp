"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { archiveLegalDocument, deleteLegalDraft, duplicateLegalDocument, publishLegalDocument, restoreLegalDocument, restoreVersionAsDraft, type DocResult } from "../doc-actions";

const btn = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60";

export function DocActions({ id, status, canPublishNow, everPublished }: { id: string; status: string; canPublishNow: boolean; everPublished: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [res, setRes] = useState<DocResult | null>(null);

  const run = (fn: () => Promise<DocResult>, then?: (r: DocResult) => void) => start(async () => { const r = await fn(); setRes(r); if (!r.ok) return; if (then) then(r); else router.refresh(); });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/legal/${id}/edit`} className={`${btn} bg-slate-900 text-white`}>Edit</Link>
        {status !== "ARCHIVED" && <button type="button" disabled={pending || !canPublishNow} onClick={() => setShowPublish((v) => !v)} className={`${btn} bg-blue-600 text-white`} title={canPublishNow ? "" : "Confirm the open decisions and fix what is listed first"}>Publish…</button>}
        <button type="button" disabled={pending} onClick={() => run(() => duplicateLegalDocument(id), (r) => router.push(`/admin/legal/${r.id}`))} className={`${btn} border border-slate-300 bg-white text-slate-800`}>Duplicate</button>
        {status === "ARCHIVED"
          ? <button type="button" disabled={pending} onClick={() => run(() => restoreLegalDocument(id))} className={`${btn} border border-emerald-300 bg-white text-emerald-700`}>Restore</button>
          : <button type="button" disabled={pending} onClick={() => { if (confirm("Archive this document? Customers will no longer see it. Its history is kept and you can restore it.")) run(() => archiveLegalDocument(id)); }} className={`${btn} border border-amber-300 bg-white text-amber-800`}>Archive</button>}
        {!everPublished && <button type="button" disabled={pending} onClick={() => { if (confirm("Delete this draft permanently? It was never published.")) run(() => deleteLegalDraft(id), () => router.push("/admin/legal")); }} className={`${btn} border border-red-200 bg-white text-red-600`}>Delete draft</button>}
      </div>

      {showPublish && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <label className="block text-sm font-medium text-slate-800">What changed in this version? (kept in the history)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <p className="mt-2 text-xs text-slate-600">Publishing creates a permanent version and makes it the one customers see. Earlier versions are always kept.</p>
          <button type="button" disabled={pending} onClick={() => run(() => publishLegalDocument(id, note), () => { setShowPublish(false); setNote(""); router.refresh(); })} className={`${btn} mt-3 bg-blue-600 text-white`}>{pending ? "Publishing…" : "Publish now"}</button>
        </div>
      )}

      {res && (
        <div role="status" className={`rounded-lg p-3 text-sm ${res.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {res.ok ? res.message : res.error}
          {res.problems && <ul className="mt-1 list-disc ps-5">{res.problems.slice(0, 6).map((p, i) => <li key={i}>{p}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

export function RestoreVersionButton({ id, version }: { id: string; version: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => { if (confirm(`Put version ${version} back into the draft? Your current draft will be replaced.`)) start(async () => { const r = await restoreVersionAsDraft(id, version); setMsg(r.ok ? (r.message ?? "Done.") : (r.error ?? "Failed.")); if (r.ok) router.refresh(); }); }} className="text-sm font-medium text-blue-600 disabled:opacity-60">Use as draft</button>
      {msg && <span role="status" className="text-xs text-slate-500">{msg}</span>}
    </span>
  );
}
