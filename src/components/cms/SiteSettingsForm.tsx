"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { saveSiteSettings } from "@/app/admin/website/site-actions";
import { whatsappLink, type SettingsInput } from "@/lib/site/siteRules";

function Bi({ label, en, ar, onEn, onAr, multiline }: { label: string; en: string; ar: string; onEn: (v: string) => void; onAr: (v: string) => void; multiline?: boolean }) {
  const cls = `${inputClassName} ${multiline ? "min-h-20" : ""}`;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {multiline ? <textarea className={cls} placeholder="English" value={en} onChange={(e) => onEn(e.target.value)} /> : <input className={cls} placeholder="English" value={en} onChange={(e) => onEn(e.target.value)} />}
        {multiline ? <textarea className={cls} dir="rtl" placeholder="العربية" value={ar} onChange={(e) => onAr(e.target.value)} /> : <input className={cls} dir="rtl" placeholder="العربية" value={ar} onChange={(e) => onAr(e.target.value)} />}
      </div>
    </div>
  );
}

const Section = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {note && <p className="mb-3 mt-1 text-xs text-slate-400">{note}</p>}
    <div className={`flex flex-col gap-4 ${note ? "" : "mt-3"}`}>{children}</div>
  </section>
);

export function SiteSettingsForm({ initial }: { initial: SettingsInput }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<SettingsInput>) => setV((s) => ({ ...s, ...patch }));

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Section title="Brand">
        <Bi label="Site name *" en={v.siteNameEn} ar={v.siteNameAr} onEn={(x) => set({ siteNameEn: x })} onAr={(x) => set({ siteNameAr: x })} />
        <Bi label="Tagline" en={v.taglineEn} ar={v.taglineAr} onEn={(x) => set({ taglineEn: x })} onAr={(x) => set({ taglineAr: x })} />
        <Bi label="Default description (SEO)" multiline en={v.descriptionEn} ar={v.descriptionAr} onEn={(x) => set({ descriptionEn: x })} onAr={(x) => set({ descriptionAr: x })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField label="Logo (optional — leave empty to keep the built-in OSTA logo)" value={v.logoUrl} onChange={(x) => set({ logoUrl: x })} />
          <ImageUploadField label="Favicon (optional)" value={v.faviconUrl} onChange={(x) => set({ faviconUrl: x })} />
        </div>
        <Field label="Default language for new visitors">
          <select className={inputClassName} value={v.defaultLocale} onChange={(e) => set({ defaultLocale: e.target.value })}>
            <option value="en">English</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
        </Field>
      </Section>

      <Section title="Contact details" note="One place for your phone, WhatsApp, email and address — used in the footer, contact page and search-engine data.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone (as shown)"><input className={inputClassName} dir="ltr" value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="WhatsApp number (digits, with country code)"><input className={inputClassName} dir="ltr" placeholder="971568676036" value={v.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
          <Field label="Email"><input className={inputClassName} dir="ltr" value={v.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        </div>
        <Bi label="WhatsApp pre-filled message" en={v.whatsappMessageEn} ar={v.whatsappMessageAr} onEn={(x) => set({ whatsappMessageEn: x })} onAr={(x) => set({ whatsappMessageAr: x })} />
        {v.whatsapp && <p className="text-xs text-slate-400">Link preview: <span dir="ltr">{whatsappLink(v.whatsapp, v.whatsappMessageEn)}</span></p>}
        <Bi label="Address" multiline en={v.addressEn} ar={v.addressAr} onEn={(x) => set({ addressEn: x })} onAr={(x) => set({ addressAr: x })} />
        <Bi label="Working hours" en={v.hoursEn} ar={v.hoursAr} onEn={(x) => set({ hoursEn: x })} onAr={(x) => set({ hoursAr: x })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Google Maps link"><input className={inputClassName} dir="ltr" placeholder="https://maps.google.com/…" value={v.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} /></Field>
          <Field label="Google Business Profile link"><input className={inputClassName} dir="ltr" placeholder="https://g.page/…" value={v.businessProfileUrl} onChange={(e) => set({ businessProfileUrl: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Header button">
        <Bi label="Button text" en={v.headerCtaLabelEn} ar={v.headerCtaLabelAr} onEn={(x) => set({ headerCtaLabelEn: x })} onAr={(x) => set({ headerCtaLabelAr: x })} />
        <Field label="Button link"><input className={inputClassName} dir="ltr" value={v.headerCtaUrl} onChange={(e) => set({ headerCtaUrl: e.target.value })} /></Field>
      </Section>

      <Section title="Footer">
        <Bi label="Copyright line (after © year and site name)" en={v.copyrightEn} ar={v.copyrightAr} onEn={(x) => set({ copyrightEn: x })} onAr={(x) => set({ copyrightAr: x })} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Areas we cover</span>
            <button type="button" onClick={() => set({ footerAreas: [...v.footerAreas, { en: "", ar: "" }] })} className="text-xs font-medium text-blue-600">+ Add area</button>
          </div>
          {v.footerAreas.map((a, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input className={inputClassName} placeholder="English" value={a.en} onChange={(e) => set({ footerAreas: v.footerAreas.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)) })} />
              <input className={inputClassName} dir="rtl" placeholder="العربية" value={a.ar} onChange={(e) => set({ footerAreas: v.footerAreas.map((x, j) => (j === i ? { ...x, ar: e.target.value } : x)) })} />
              <button type="button" onClick={() => set({ footerAreas: v.footerAreas.filter((_, j) => j !== i) })} className="px-2 text-sm text-red-600">✕</button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Search engines">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={v.allowIndexing} onChange={(e) => set({ allowIndexing: e.target.checked })} />
          <span>
            Allow search engines to index the website
            <span className="block text-xs text-slate-400">Turn this off while the site is being rebuilt. It tells Google and others not to list any page.</span>
          </span>
        </label>
      </Section>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await saveSiteSettings(v);
              if (res.ok) showToast("Site settings saved.");
              else setError(res.error ?? "Could not save.");
            })
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
