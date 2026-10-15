"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { CODE_CONSENT, MAX_CODE_CHARS, codeWarnings, type CodeInput } from "@/lib/site/codeRules";

const mono = "w-full rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs leading-relaxed text-emerald-100 outline-none focus:border-blue-400 min-h-40";

// Two code boxes (header = inside <head>, footer = end of <body>), each with its own "when to load" choice.
export function CodeForm({ initial, onSave, saveLabel = "Save code" }: { initial: CodeInput; onSave: (c: CodeInput) => Promise<{ ok: boolean; error?: string }>; saveLabel?: string }) {
  const { showToast } = useToast();
  const [v, setV] = useState<CodeInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<CodeInput>) => setV((c) => ({ ...c, ...patch }));

  const box = (label: string, hint: string, codeKey: "headCode" | "bodyCode", consentKey: "headCodeConsent" | "bodyCodeConsent") => (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <textarea spellCheck={false} className={mono} value={v[codeKey]} onChange={(e) => set({ [codeKey]: e.target.value })} placeholder="<script>…</script>" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <label className="flex items-center gap-2">
          Load:
          <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" value={v[consentKey]} onChange={(e) => set({ [consentKey]: e.target.value })}>
            {CODE_CONSENT.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <span>{v[codeKey].length.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()}</span>
      </div>
      {codeWarnings(v[codeKey]).map((w) => <p key={w} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{w}</p>)}
    </div>
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>Only paste code you trust.</b> It runs in your visitors&apos; browsers and can read what they see and type. Code that tracks visitors (analytics, ads, pixels) should load only after the visitor allows the matching cookies, which is the default. Changes are recorded in the Audit Log.
      </div>
      {box("Header code", "Added inside <head>: tracking tags, pixels, site-verification tags, fonts.", "headCode", "headCodeConsent")}
      {box("Footer code", "Added at the end of <body>: chat widgets, conversion scripts, noscript fallbacks.", "bodyCode", "bodyCodeConsent")}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { setError(null); const r = await onSave(v); if (r.ok) showToast("Code saved."); else setError(r.error ?? "Could not save."); })}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
