"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveLegalDraft } from "../../doc-actions";
import { COUNTRIES, DOC_KINDS, KIND_LABEL, numberSections, type DocKind, type LegalSection } from "@/lib/legal/content";

type Props = {
  id: string; slug: string;
  initial: { titleEn: string; titleAr: string; summaryEn: string; summaryAr: string; introEn: string; introAr: string; sections: LegalSection[]; seo: { titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string }; kind: string; countries: string[]; related: string[]; effectiveDate: string; categoryId: string };
  categories: { id: string; key: string; nameEn: string }[];
  others: { slug: string; titleEn: string }[];
};

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900";
const lab = "block text-xs font-medium text-slate-600";
let counter = 0;

export function Editor({ id, slug, initial, categories, others }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const numbers = numberSections(d.sections);

  const patch = (i: number, p: Partial<LegalSection>) => set("sections", d.sections.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const move = (i: number, by: number) => { const to = i + by; if (to < 0 || to >= d.sections.length) return; const a = [...d.sections]; [a[i], a[to]] = [a[to], a[i]]; set("sections", a); };
  const remove = (i: number) => set("sections", d.sections.filter((_, j) => j !== i));
  const add = (at: number, level: 1 | 2 | 3 = 2) => { const a = [...d.sections]; a.splice(at, 0, { id: `n${Date.now().toString(36)}${counter++}`, level, headingEn: "", headingAr: "", bodyEn: "", bodyAr: "" }); set("sections", a); };

  const save = () => start(async () => {
    const r = await saveLegalDraft(id, { ...d, sections: d.sections, seo: d.seo });
    setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved.") : (r.error ?? "Something went wrong.") });
    if (r.ok) router.refresh();
  });

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <Link href={`/admin/legal/${id}`} className="text-sm font-medium text-blue-600">← Back to the document</Link>
        <div className="flex items-center gap-3">
          {msg && <span role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
          <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save draft"}</button>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Document</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lab}>Title (English) *<input value={d.titleEn} onChange={(e) => set("titleEn", e.target.value)} className={input} /></label>
          <label className={lab}>العنوان (Arabic) *<input dir="rtl" value={d.titleAr} onChange={(e) => set("titleAr", e.target.value)} className={input} /></label>
          <label className={lab}>Short summary (English)<textarea rows={2} value={d.summaryEn} onChange={(e) => set("summaryEn", e.target.value)} className={input} /></label>
          <label className={lab}>الملخص (Arabic)<textarea dir="rtl" rows={2} value={d.summaryAr} onChange={(e) => set("summaryAr", e.target.value)} className={input} /></label>
          <label className={lab}>Introduction (English)<textarea rows={4} value={d.introEn} onChange={(e) => set("introEn", e.target.value)} className={input} /></label>
          <label className={lab}>المقدمة (Arabic)<textarea dir="rtl" rows={4} value={d.introAr} onChange={(e) => set("introAr", e.target.value)} className={input} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={lab}>Category<select value={d.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={input}>{categories.map((c) => <option key={c.id} value={c.id}>{c.key} · {c.nameEn}</option>)}</select></label>
          <label className={lab}>Type<select value={d.kind} onChange={(e) => set("kind", e.target.value)} className={input}>{DOC_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k as DocKind]}</option>)}</select></label>
          <label className={lab}>Effective date<input type="date" value={d.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} className={input} /></label>
        </div>
        <div>
          <p className={lab}>Applies in</p>
          <div className="mt-1 flex flex-wrap gap-4">
            {COUNTRIES.map((c) => (
              <label key={c.code} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={d.countries.includes(c.code)} onChange={(e) => set("countries", e.target.checked ? [...d.countries, c.code] : d.countries.filter((x) => x !== c.code))} />
                {c.nameEn}{!c.live && <span className="text-xs text-slate-400"> (coming later)</span>}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className={lab}>Related documents</p>
          <div className="mt-1 grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
            {others.filter((o) => o.slug !== slug).map((o) => (
              <label key={o.slug} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={d.related.includes(o.slug)} onChange={(e) => set("related", e.target.checked ? [...d.related, o.slug] : d.related.filter((x) => x !== o.slug))} />{o.titleEn}</label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Search results (SEO)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lab}>SEO title (English)<input value={d.seo.titleEn ?? ""} onChange={(e) => set("seo", { ...d.seo, titleEn: e.target.value })} className={input} /></label>
          <label className={lab}>عنوان السيو (Arabic)<input dir="rtl" value={d.seo.titleAr ?? ""} onChange={(e) => set("seo", { ...d.seo, titleAr: e.target.value })} className={input} /></label>
          <label className={lab}>Meta description (English)<textarea rows={2} value={d.seo.descriptionEn ?? ""} onChange={(e) => set("seo", { ...d.seo, descriptionEn: e.target.value })} className={input} /></label>
          <label className={lab}>وصف السيو (Arabic)<textarea dir="rtl" rows={2} value={d.seo.descriptionAr ?? ""} onChange={(e) => set("seo", { ...d.seo, descriptionAr: e.target.value })} className={input} /></label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Clauses ({d.sections.filter((s) => s.level !== 1).length})</h3>
          <div className="flex gap-2"><button type="button" onClick={() => add(0, 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">+ Part heading at top</button><button type="button" onClick={() => add(0)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">+ Clause at top</button></div>
        </div>
        <p className="text-xs text-slate-500">Writing format: a blank line starts a new paragraph; start a line with “- ” for a bullet, “1. ” for a numbered list, “&gt; ” for a highlighted notice, “### ” for a small heading, or “| a | b |” for a table. Use {"{{decision_key}}"} for a decision you confirm under Decisions to confirm.</p>
        {d.sections.map((s, i) => (
          <div key={s.id} className={`rounded-xl border bg-white p-4 ${s.level === 1 ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{s.level === 1 ? "PART" : numbers[i]}</span>
                <select value={s.level} onChange={(e) => patch(i, { level: Number(e.target.value) as 1 | 2 | 3 })} aria-label="Section type" className="rounded border border-slate-300 px-2 py-1 text-xs">
                  <option value={1}>Part heading</option><option value={2}>Clause</option><option value={3}>Sub-clause</option>
                </select>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === d.sections.length - 1} aria-label="Move down" className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => add(i + 1)} className="rounded border border-slate-300 px-2 py-0.5">+ below</button>
                <button type="button" onClick={() => remove(i)} className="rounded border border-red-200 px-2 py-0.5 text-red-600">Remove</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={lab}>Heading (English)<input value={s.headingEn} onChange={(e) => patch(i, { headingEn: e.target.value })} className={input} /></label>
                <label className={`${lab} mt-2`}>Text (English)<textarea rows={s.level === 1 ? 2 : 4} value={s.bodyEn} onChange={(e) => patch(i, { bodyEn: e.target.value })} className={input} /></label></div>
              <div><label className={lab}>العنوان (Arabic)<input dir="rtl" value={s.headingAr} onChange={(e) => patch(i, { headingAr: e.target.value })} className={input} /></label>
                <label className={`${lab} mt-2`}>النص (Arabic)<textarea dir="rtl" rows={s.level === 1 ? 2 : 4} value={s.bodyAr} onChange={(e) => patch(i, { bodyAr: e.target.value })} className={input} /></label></div>
            </div>
          </div>
        ))}
        <div className="flex gap-2"><button type="button" onClick={() => add(d.sections.length, 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">+ Part heading</button><button type="button" onClick={() => add(d.sections.length)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">+ Clause</button></div>
      </section>
    </div>
  );
}
