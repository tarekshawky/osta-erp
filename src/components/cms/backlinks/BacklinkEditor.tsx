"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { saveBacklink, type BacklinkInput } from "@/app/admin/website/backlink-actions";

const TYPES = ["dofollow", "nofollow", "sponsored", "ugc"];
const STATUSES = ["ACTIVE", "PENDING", "LOST", "REJECTED"];

// Every detail of one record, including your own campaign name and notes.
export function BacklinkEditor({ id, initial, onDone }: { id: string; initial: BacklinkInput; onDone: () => void }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (p: Partial<BacklinkInput>) => setV((s) => ({ ...s, ...p }));
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Page that links to you *"><input className={inputClassName} dir="ltr" value={v.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} /></Field>
        <Field label="Your page being linked *"><input className={inputClassName} dir="ltr" value={v.targetUrl} onChange={(e) => set({ targetUrl: e.target.value })} /></Field>
        <Field label="Anchor text"><input className={inputClassName} value={v.anchorText} onChange={(e) => set({ anchorText: e.target.value })} /></Field>
        <Field label="Campaign"><input className={inputClassName} value={v.campaign} onChange={(e) => set({ campaign: e.target.value })} /></Field>
        <Field label="Link type"><select className={inputClassName} value={v.linkType} onChange={(e) => set({ linkType: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Status"><select className={inputClassName} value={v.status} onChange={(e) => set({ status: e.target.value })}>{STATUSES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Discovered"><input type="date" className={inputClassName} value={v.discoveredAt} onChange={(e) => set({ discoveredAt: e.target.value })} /></Field>
        <Field label="Notes"><input className={inputClassName} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button type="button" disabled={pending} onClick={() => startTransition(async () => { setError(null); const r = await saveBacklink(id, v); if (r.ok) { showToast("Backlink saved."); onDone(); } else setError(r.error ?? "Could not save."); })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">Cancel</button>
      </div>
    </div>
  );
}
