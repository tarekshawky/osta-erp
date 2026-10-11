"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { checkOutboundLinks, type OutboundResult } from "@/app/admin/website/backlink-actions";

export type PageLinks = { id: string; title: string; slug: string; internalOut: string[]; external: string[]; internalIn: string[]; backlinks: number };

function Row({ p }: { p: PageLinks }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<OutboundResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const broken = results?.filter((r) => r.status === null || r.status >= 400).length;

  return (
    <>
      <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(!open)}>
        <td className="px-4 py-3"><p className="font-medium text-slate-900">{p.title}</p><p className="font-mono text-xs text-slate-400">/{p.slug}</p></td>
        <td className="px-4 py-3 text-slate-600">{p.internalOut.length}</td>
        <td className="px-4 py-3 text-slate-600">{p.external.length}</td>
        <td className="px-4 py-3 text-slate-600">{p.internalIn.length}</td>
        <td className="px-4 py-3 text-slate-600">{p.backlinks}</td>
        <td className="px-4 py-3 text-right text-xs text-blue-600">{open ? "Hide" : "Details"}</td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-4 text-xs text-slate-600">
            <div className="grid gap-4 md:grid-cols-3">
              <div><p className="mb-1 font-semibold text-slate-500">Links to your pages</p>{p.internalOut.length ? p.internalOut.map((l) => <p key={l} className="font-mono">{l}</p>) : <p className="text-slate-400">None</p>}</div>
              <div><p className="mb-1 font-semibold text-slate-500">Other pages that link here</p>{p.internalIn.length ? p.internalIn.map((l) => <p key={l}>{l}</p>) : <p className="text-slate-400">None — an orphan page is hard for visitors and search engines to find.</p>}</div>
              <div>
                <p className="mb-1 font-semibold text-slate-500">Links to other websites</p>
                {p.external.length ? p.external.map((l) => {
                  const r = results?.find((x) => x.url === l);
                  return <p key={l} className="break-all">{l} {r && <b className={r.status !== null && r.status < 400 ? "text-emerald-600" : "text-red-600"}>{r.status ?? r.error}</b>}</p>;
                }) : <p className="text-slate-400">None</p>}
                {p.external.length > 0 && (
                  <button type="button" disabled={pending} onClick={(e) => { e.stopPropagation(); startTransition(async () => { setError(null); const r = await checkOutboundLinks(p.id); if (r.ok) setResults(r.results ?? []); else setError(r.error ?? "Check failed."); }); }} className="mt-2 font-medium text-blue-600 disabled:opacity-50">
                    {pending ? "Checking…" : "Check these links"}
                  </button>
                )}
                {broken !== undefined && <p className={`mt-1 font-semibold ${broken ? "text-red-600" : "text-emerald-600"}`}>{broken ? `${broken} broken` : "All working"}</p>}
                {error && <p className="mt-1 text-red-500">{error}</p>}
              </div>
            </div>
            <Link href={`/admin/website/pages/${p.id}`} className="mt-3 inline-block font-medium text-blue-600">Edit this page</Link>
          </td>
        </tr>
      )}
    </>
  );
}

export function LinkReport({ pages }: { pages: PageLinks[] }) {
  return (
    <div className="max-w-5xl overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
          <tr><th className="px-4 py-3">Page</th><th className="px-4 py-3">Links out (yours)</th><th className="px-4 py-3">Links out (external)</th><th className="px-4 py-3">Linked from</th><th className="px-4 py-3">Backlinks</th><th className="px-4 py-3" /></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pages.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No pages yet.</td></tr>}
          {pages.map((p) => (<Row key={p.id} p={p} />))}
        </tbody>
      </table>
    </div>
  );
}
