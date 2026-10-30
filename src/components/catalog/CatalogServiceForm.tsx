"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { SeoFields } from "@/components/catalog/SeoFields";
import { deleteCatalogService, saveCatalogService } from "@/app/admin/catalog/actions";
import { ICON_NAMES } from "@/lib/cms/icons";
import type { ServiceInput } from "@/lib/catalog/rules";

export type CategoryOption = { id: string; code: string; nameEn: string; nameAr: string };
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CatalogServiceForm({ id, initial, categories, backHref }: { id: string | null; initial: ServiceInput; categories: CategoryOption[]; backHref: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [v, setV] = useState<ServiceInput>(initial);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<ServiceInput>) => setV((c) => ({ ...c, ...patch }));
  const toggle = (cid: string) => set({ categoryIds: v.categoryIds.includes(cid) ? v.categoryIds.filter((x) => x !== cid) : [...v.categoryIds, cid] });

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await saveCatalogService(id, v);
      if (r.ok) {
        showToast("Service saved.");
        if (!id && r.id) router.replace(`/admin/catalog/service/${r.id}`);
        else router.refresh();
      } else setError(r.error ?? "Could not save.");
    });
  }

  return (
    <div className="flex max-w-4xl flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name (English) *"><input className={inputClassName} value={v.nameEn} onChange={(e) => { const nameEn = e.target.value; set({ nameEn, ...(slugTouched ? {} : { slug: toSlug(nameEn) }) }); }} /></Field>
        <Field label="اسم الخدمة (Arabic) *" dir="rtl"><input className={inputClassName} dir="rtl" value={v.nameAr} onChange={(e) => set({ nameAr: e.target.value })} /></Field>
      </div>
      <Field label="SEO URL slug *"><input className={inputClassName} dir="ltr" value={v.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }} /></Field>

      <div className="rounded-lg border border-slate-200 p-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-800">Categories * <span className="font-normal text-slate-500">(a service can belong to several)</span></h4>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={v.categoryIds.includes(c.id)} onChange={() => toggle(c.id)} /> <span className="text-slate-400">{c.code}</span> {c.nameEn}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sub-heading in the category (English, optional)"><input className={inputClassName} value={v.groupEn} onChange={(e) => set({ groupEn: e.target.value })} placeholder="Elevator Services" /></Field>
        <Field label="العنوان الفرعي (Arabic، اختياري)" dir="rtl"><input className={inputClassName} dir="rtl" value={v.groupAr} onChange={(e) => set({ groupAr: e.target.value })} /></Field>
        <Field label="Short description (English)"><textarea className={`${inputClassName} min-h-20`} value={v.shortDescriptionEn} onChange={(e) => set({ shortDescriptionEn: e.target.value })} /></Field>
        <Field label="وصف مختصر (Arabic)" dir="rtl"><textarea className={`${inputClassName} min-h-20`} dir="rtl" value={v.shortDescriptionAr} onChange={(e) => set({ shortDescriptionAr: e.target.value })} /></Field>
        <Field label="Full description (English)"><textarea className={`${inputClassName} min-h-36`} value={v.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} /></Field>
        <Field label="الوصف الكامل (Arabic)" dir="rtl"><textarea className={`${inputClassName} min-h-36`} dir="rtl" value={v.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Icon">
          <select className={inputClassName} value={v.iconName} onChange={(e) => set({ iconName: e.target.value })}>
            <option value="">None</option>
            {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <ImageUploadField label="Service image" value={v.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">Gallery <span className="font-normal text-slate-500">({v.gallery.length}/20)</span></h4>
        <div className="grid gap-4 sm:grid-cols-3">
          {v.gallery.map((url, i) => (
            <div key={i} className="flex flex-col gap-2">
              <ImageUploadField label={`Image ${i + 1}`} value={url} onChange={(u) => set({ gallery: u ? v.gallery.map((g, n) => (n === i ? u : g)) : v.gallery.filter((_, n) => n !== i) })} />
            </div>
          ))}
        </div>
        {v.gallery.length < 20 && <button type="button" onClick={() => set({ gallery: [...v.gallery, ""] })} className="mt-3 text-sm font-medium text-blue-600">+ Add gallery image</button>}
      </div>

      <SeoFields value={v} onChange={(p) => set(p)} slugHint="The slug above is the address of the service page." />

      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={v.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save service"}</button>
        <Link href={backHref} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600">Back</Link>
        {id && (
          <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete “${v.nameEn}”? This can't be undone.`)) startTransition(async () => { const r = await deleteCatalogService(id); if (r.ok) router.replace(backHref); else showToast(r.error ?? "Could not delete.", "error"); }); }} className="ms-auto rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600">Delete</button>
        )}
      </div>
    </div>
  );
}
