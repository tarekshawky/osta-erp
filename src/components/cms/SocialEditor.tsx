"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { saveSocialLinks, type SocialInput } from "@/app/admin/website/site-actions";
import { SOCIAL_PLATFORMS } from "@/lib/site/siteRules";

export function SocialEditor({ initial }: { initial: SocialInput[] }) {
  const { showToast } = useToast();
  const [links, setLinks] = useState<SocialInput[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const patch = (i: number, p: Partial<SocialInput>) => setLinks((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setLinks((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const copy = [...l];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-3">
        {links.length === 0 && <p className="text-sm text-slate-400">No social links yet.</p>}
        {links.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[140px_1fr_1.6fr_auto]">
            <select className={inputClassName} value={l.platform} onChange={(e) => patch(i, { platform: e.target.value })}>
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <input className={inputClassName} placeholder={l.platform === "custom" ? "Name (required)" : "Label (optional)"} value={l.label} onChange={(e) => patch(i, { label: e.target.value })} />
            <input className={inputClassName} dir="ltr" placeholder="https://…" value={l.url} onChange={(e) => patch(i, { url: e.target.value })} />
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={l.visible} onChange={(e) => patch(i, { visible: e.target.checked })} /> Show</label>
              <button type="button" aria-label="Move up" onClick={() => move(i, -1)}>▲</button>
              <button type="button" aria-label="Move down" onClick={() => move(i, 1)}>▼</button>
              <button type="button" onClick={() => setLinks((x) => x.filter((_, j) => j !== i))} className="font-medium text-red-600">Remove</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setLinks((l) => [...l, { platform: "facebook", label: "", url: "", visible: true }])} className="mt-3 text-sm font-medium text-blue-600">
        + Add link
      </button>
      <p className="mt-3 text-xs text-slate-400">Shown as icons in the footer and listed in your search-engine business data.</p>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await saveSocialLinks(links);
            if (res.ok) showToast("Social links saved.");
            else setError(res.error ?? "Could not save.");
          })
        }
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save social links"}
      </button>
    </div>
  );
}
