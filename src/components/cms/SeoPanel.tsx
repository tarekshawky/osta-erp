"use client";

import { useState } from "react";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import type { SeoInput } from "@/app/admin/website/actions";
import { DESC_MAX, TITLE_MAX, type SeoIssue } from "@/lib/seo/analyze";

export type Analysis = { score: number; issues: SeoIssue[] };

export const scoreStyle = (score: number) => (score >= 80 ? "bg-emerald-50 text-emerald-700" : score >= 55 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600");

const SEV: Record<SeoIssue["severity"], { label: string; dot: string }> = {
  error: { label: "Fix", dot: "bg-red-500" },
  warn: { label: "Improve", dot: "bg-amber-400" },
  info: { label: "Tip", dot: "bg-slate-300" },
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function SeoPanel({
  seo, setSeo, titleEn, titleAr, slug, origin, analysis,
}: {
  seo: SeoInput; setSeo: (patch: Partial<SeoInput>) => void; titleEn: string; titleAr: string; slug: string; origin: string; analysis: Analysis | null;
}) {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const ar = lang === "ar";
  const title = clip((ar ? seo.titleAr || titleAr : seo.titleEn || titleEn) || "Untitled", TITLE_MAX);
  const desc = clip((ar ? seo.descriptionAr : seo.descriptionEn) || "No meta description yet — search engines will pick text from the page.", DESC_MAX);
  const host = origin.replace(/^https?:\/\//, "");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-slate-500">SEO</h3>
        {analysis ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scoreStyle(analysis.score)}`} aria-live="polite">Score {analysis.score}/100</span>
        ) : (
          <span className="text-xs text-slate-400">Checking…</span>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 p-3" dir={ar ? "rtl" : "ltr"}>
        <div className="mb-2 flex gap-2" dir="ltr">
          {(["en", "ar"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`rounded px-2 py-0.5 text-[11px] font-medium ${lang === l ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {l === "en" ? "English" : "العربية"}
            </button>
          ))}
          <span className="text-[11px] text-slate-400">Google preview</span>
        </div>
        <p className="truncate text-xs text-emerald-700" dir="ltr">{host} › {slug || "…"}</p>
        <p className="mt-0.5 text-[17px] leading-snug text-blue-700">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-600">{desc}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Field label={`SEO title (English) · ${seo.titleEn.length}/${TITLE_MAX}`}><input className={inputClassName} value={seo.titleEn} onChange={(e) => setSeo({ titleEn: e.target.value })} /></Field>
        <Field label={`عنوان السيو (Arabic) · ${seo.titleAr.length}/${TITLE_MAX}`} dir="rtl"><input className={inputClassName} dir="rtl" value={seo.titleAr} onChange={(e) => setSeo({ titleAr: e.target.value })} /></Field>
        <Field label={`Meta description (English) · ${seo.descriptionEn.length}/${DESC_MAX}`}><textarea className={`${inputClassName} min-h-20`} value={seo.descriptionEn} onChange={(e) => setSeo({ descriptionEn: e.target.value })} /></Field>
        <Field label={`وصف السيو (Arabic) · ${seo.descriptionAr.length}/${DESC_MAX}`} dir="rtl"><textarea className={`${inputClassName} min-h-20`} dir="rtl" value={seo.descriptionAr} onChange={(e) => setSeo({ descriptionAr: e.target.value })} /></Field>
        <Field label="Focus keyword"><input className={inputClassName} placeholder="e.g. ac repair ajman" value={seo.focusKeyword} onChange={(e) => setSeo({ focusKeyword: e.target.value })} /></Field>
        <Field label="Other keywords (comma separated)"><input className={inputClassName} value={seo.secondaryKeywords} onChange={(e) => setSeo({ secondaryKeywords: e.target.value })} /></Field>
        <Field label="Canonical URL (optional)"><input className={inputClassName} dir="ltr" value={seo.canonical} onChange={(e) => setSeo({ canonical: e.target.value })} /></Field>
        <ImageUploadField label="Social share image" value={seo.ogImage} onChange={(v) => setSeo({ ogImage: v })} />
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={seo.noindex} onChange={(e) => setSeo({ noindex: e.target.checked })} /> Hide from search engines (noindex)</label>
      </div>

      {analysis && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Checks</p>
          {analysis.issues.length === 0 ? (
            <p className="text-xs text-emerald-600">Everything looks good.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...analysis.issues].sort((a, b) => ["error", "warn", "info"].indexOf(a.severity) - ["error", "warn", "info"].indexOf(b.severity)).map((i) => (
                <li key={i.id} className="flex gap-2 text-xs text-slate-600">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEV[i.severity].dot}`} aria-hidden />
                  <span><b className="text-slate-800">{SEV[i.severity].label}:</b> {i.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
