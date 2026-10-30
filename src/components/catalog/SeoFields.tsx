"use client";

import { Field, inputClassName } from "@/components/FormField";
import type { SeoInput } from "@/lib/catalog/rules";

// SEO block shared by the category and service forms.
export function SeoFields({ value, onChange, slugHint }: { value: SeoInput; onChange: (patch: Partial<SeoInput>) => void; slugHint?: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">SEO</h4>
      {slugHint && <p className="text-xs text-slate-500">{slugHint}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SEO title (English)"><input className={inputClassName} value={value.seoTitleEn} onChange={(e) => onChange({ seoTitleEn: e.target.value })} placeholder="Defaults to the name" /></Field>
        <Field label="عنوان السيو (Arabic)" dir="rtl"><input className={inputClassName} dir="rtl" value={value.seoTitleAr} onChange={(e) => onChange({ seoTitleAr: e.target.value })} /></Field>
        <Field label="Meta description (English)"><textarea className={`${inputClassName} min-h-16`} value={value.seoDescriptionEn} onChange={(e) => onChange({ seoDescriptionEn: e.target.value })} placeholder="Defaults to the short description" /></Field>
        <Field label="وصف السيو (Arabic)" dir="rtl"><textarea className={`${inputClassName} min-h-16`} dir="rtl" value={value.seoDescriptionAr} onChange={(e) => onChange({ seoDescriptionAr: e.target.value })} /></Field>
        <Field label="Keywords (English, comma separated)"><textarea className={`${inputClassName} min-h-16`} value={value.seoKeywordsEn} onChange={(e) => onChange({ seoKeywordsEn: e.target.value })} /></Field>
        <Field label="الكلمات المفتاحية (Arabic، افصل بينها بفاصلة)" dir="rtl"><textarea className={`${inputClassName} min-h-16`} dir="rtl" value={value.seoKeywordsAr} onChange={(e) => onChange({ seoKeywordsAr: e.target.value })} /></Field>
      </div>
      <Field label="Canonical URL (optional: leave empty to use the page's own address)"><input className={inputClassName} dir="ltr" value={value.canonicalUrl} onChange={(e) => onChange({ canonicalUrl: e.target.value })} placeholder="https://…" /></Field>
    </div>
  );
}
