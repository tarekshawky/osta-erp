"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { deleteRedirect, saveRedirect } from "@/app/admin/website/redirect-actions";

export type RedirectRow = { id: string; from: string; to: string; created: string };

export function RedirectManager({ rows }: { rows: RedirectRow[] }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-3xl">
      <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input className={inputClassName} dir="ltr" placeholder="/old-page" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={inputClassName} dir="ltr" placeholder="/new-page or https://…" value={to} onChange={(e) => setTo(e.target.value)} />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await saveRedirect(from, to);
              if (res.ok) {
                showToast("Redirect saved.");
                setFrom("");
                setTo("");
                router.refresh();
              } else setError(res.error ?? "Could not save.");
            })
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add redirect
        </button>
        {error && <p className="text-sm text-red-500 sm:col-span-3">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Type</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No redirects. One is added automatically when you rename a published page.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.from}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.to}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">301 permanent</td>
                <td className="px-4 py-2.5 text-right">
                  <button type="button" onClick={async () => { const res = await deleteRedirect(r.id); showToast(res.ok ? "Removed." : res.error ?? "Failed.", res.ok ? "success" : "error"); router.refresh(); }} className="text-xs font-medium text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
