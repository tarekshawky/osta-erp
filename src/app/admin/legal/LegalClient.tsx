"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadStarterDocuments, saveLegalField } from "./actions";

export function LoadStarterButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { const r = await loadStarterDocuments(); setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Done.") : (r.error ?? "Something went wrong.") }); router.refresh(); })}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Loading…" : label}
      </button>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}

export function FieldForm({ field }: { field: { key: string; labelEn: string; labelAr: string; hintEn: string; valueEn: string; valueAr: string; confirmed: boolean } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [en, setEn] = useState(field.valueEn);
  const [ar, setAr] = useState(field.valueAr);
  const [ok, setOk] = useState(field.confirmed);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className={`rounded-xl border bg-white p-4 ${field.confirmed ? "border-emerald-200" : "border-amber-300"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{field.labelEn} <span dir="rtl" className="font-normal text-slate-500">· {field.labelAr}</span></p>
          <p className="text-xs text-slate-500"><code className="rounded bg-slate-100 px-1">{`{{${field.key}}}`}</code> {field.hintEn}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${field.confirmed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{field.confirmed ? "Confirmed" : "To confirm"}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">English value
          <input value={en} onChange={(e) => setEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
        </label>
        <label className="text-xs font-medium text-slate-600">القيمة بالعربي
          <input dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I confirm this is decided</label>
        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveLegalField({ key: field.key, valueEn: en, valueAr: ar, confirmed: ok }); setMsg({ ok: r.ok, text: r.ok ? "Saved." : (r.error ?? "Something went wrong.") }); if (r.ok) router.refresh(); })} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
