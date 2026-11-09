"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentStatus, Counts } from "@/lib/contentCopy";
import { copyContentAction, freeUpAction } from "./actions";

const ROWS: { key: keyof Counts; label: string }[] = [
  { key: "folders", label: "Media folders" },
  { key: "assets", label: "Images" },
  { key: "variants", label: "Image sizes (the files)" },
  { key: "audit", label: "Audit log entries" },
];

export function ContentDatabasePanel({ status }: { status: ContentStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const left = status.missing ? Object.values(status.missing).reduce((a, b) => a + b, 0) : 0;

  async function copy() {
    setBusy(true); setMsg(null);
    try {
      const r = await copyContentAction();
      setMsg(r.ok ? { ok: true, text: r.finished ? "Everything is copied." : "Part of it was copied. Press the button again to continue." } : { ok: false, text: r.error ?? "Could not copy." });
    } catch {
      setMsg({ ok: false, text: "Something went wrong. Nothing was lost; press the button again." });
    }
    setBusy(false);
    router.refresh();
  }
  async function freeUp() {
    if (!window.confirm("Empty the old copies of the media library and audit log in the MAIN database?\n\nThey are already in the content database. This cannot be undone. Make sure you have a backup.")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await freeUpAction();
      setMsg(r.ok ? { ok: true, text: "The old copies were removed and the space was released." } : { ok: false, text: r.error ?? "Could not free up." });
    } catch {
      setMsg({ ok: false, text: "Something went wrong. Nothing was deleted." });
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <p className={`rounded-xl border p-4 text-sm ${status.separate ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        {status.separate ? "The content database is connected. New images and audit entries are saved there." : "The content database is not connected yet. Everything still uses the main database, exactly as before."}
      </p>

      <div className="overflow-hidden rounded-2xl border border-[#DCE5F7] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">What</th><th className="px-4 py-2 text-right">Main database</th><th className="px-4 py-2 text-right">Content database</th><th className="px-4 py-2 text-right">Not copied yet</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{r.label}</td>
                <td className="px-4 py-2 text-right">{status.main[r.key]}</td>
                <td className="px-4 py-2 text-right">{status.content ? status.content[r.key] : "—"}</td>
                <td className={`px-4 py-2 text-right font-semibold ${status.missing && status.missing[r.key] ? "text-amber-700" : "text-slate-400"}`}>{status.missing ? status.missing[r.key] : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !status.separate || left === 0} onClick={copy} className="rounded-lg bg-[#0B2A6B] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Working…" : left === 0 && status.separate ? "Everything is copied" : "Copy to the content database"}</button>
        <button type="button" disabled={busy || !status.separate || left > 0 || Object.values(status.main).every((n) => n === 0)} onClick={freeUp} className="rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-40">Free up the main database</button>
      </div>
      <p className="text-xs text-slate-500">Copying only reads from the main database and can be repeated safely. &quot;Free up&quot; is available only after everything is copied, and it empties just those four old tables.</p>
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
