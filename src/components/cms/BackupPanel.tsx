"use client";

import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { importContent, type ImportResult } from "@/app/admin/website/backup-actions";

export function BackupPanel({ canImport }: { canImport: boolean }) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [json, setJson] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function pick(file: File | undefined) {
    if (!file) return;
    setResult(null);
    setName(file.name);
    const text = await file.text();
    setJson(text);
    startTransition(async () => setResult(await importContent(text, "check")));
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Export</h3>
        <p className="mb-3 mt-1 text-xs text-slate-400">Downloads all pages (as drafts), site settings, menus, social links, forms, service areas and redirects as one file. It does <b>not</b> include leads, customers, orders or uploaded image files.</p>
        <a href="/admin/website/backup/export" className="inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Download content backup</a>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Import</h3>
        {!canImport ? (
          <p className="mt-2 text-sm text-slate-500">Only the Owner can import a backup, because it overwrites site-wide content.</p>
        ) : (
          <>
            <p className="mb-3 mt-1 text-xs text-slate-400">
              Choose a backup file. It is checked first and nothing changes until you confirm. Pages always arrive as <b>drafts</b>: a page that is live keeps its live version until you publish the imported draft. Existing pages with the same address get their draft replaced (the change is saved in History).
            </p>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Choose backup file…</button>
            {name && <span className="ml-3 text-xs text-slate-500">{name}</span>}

            {result && !result.ok && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">This file can&apos;t be imported:</p>
                <ul className="mt-1 list-disc pl-5 text-xs">{result.errors.map((e, i) => (<li key={i}>{e}</li>))}</ul>
              </div>
            )}
            {result?.ok && !result.applied && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-semibold">The file is valid. It contains:</p>
                <p className="mt-1 text-xs">{Object.entries(result.summary).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(" · ") || "nothing"}</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => { if (!json || !confirm("Import this content? Pages arrive as drafts; site settings, menus and social links in the file replace the current ones.")) return; startTransition(async () => { const r = await importContent(json, "apply"); setResult(r); if (r.ok) showToast("Content imported."); }); }}
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {pending ? "Importing…" : "Import now"}
                </button>
              </div>
            )}
            {result?.ok && result.applied && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <p className="text-sm font-semibold">Import finished.</p>
                <p className="mt-1">Created: {Object.entries(result.report.created).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing"}</p>
                <p>Updated: {Object.entries(result.report.updated).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing"}</p>
                {result.report.skipped.map((s, i) => (<p key={i} className="text-amber-700">Skipped: {s}</p>))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
