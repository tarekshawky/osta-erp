"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { deleteCategory, deleteCategoryField, saveCategory, saveCategoryField } from "@/app/admin/jobs/settings/settings-actions";
import type { CategoryDto } from "@/lib/jobs/service";

type FieldDto = CategoryDto["fields"][number];
type FieldDraft = { id: string | null; categoryId: string; key: string; labelEn: string; labelAr: string; inputType: "select" | "text" | "number" | "boolean"; options: { value: string; labelEn: string; labelAr: string }[]; appliesTo: ("PERMANENT" | "DAILY")[]; required: boolean; showInAd: boolean; sortOrder: number };

const slugKey = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const blankField = (categoryId: string, order: number): FieldDraft => ({ id: null, categoryId, key: "", labelEn: "", labelAr: "", inputType: "select", options: [{ value: "", labelEn: "", labelAr: "" }, { value: "", labelEn: "", labelAr: "" }], appliesTo: ["PERMANENT", "DAILY"], required: false, showInAd: true, sortOrder: order });
const toDraft = (f: FieldDto, categoryId: string): FieldDraft => ({ id: f.id, categoryId, key: f.key, labelEn: f.labelEn, labelAr: f.labelAr, inputType: f.inputType as FieldDraft["inputType"], options: f.options, appliesTo: f.appliesTo, required: f.required, showInAd: f.showInAd, sortOrder: f.sortOrder });

// Job categories and the extra fields of each category (for example "paint finish" for painting).
export function CategoriesManager({ categories }: { categories: CategoryDto[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [cat, setCat] = useState<{ id: string | null; key: string; nameEn: string; nameAr: string; active: boolean; sortOrder: number } | null>(null);
  const [field, setField] = useState<FieldDraft | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        showToast(ok);
        after?.();
        router.refresh();
      } else showToast(r.error ?? "Something went wrong.", "error");
    });

  return (
    <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Job categories &amp; category fields</h3>
        <button type="button" onClick={() => setCat({ id: null, key: "", nameEn: "", nameAr: "", active: true, sortOrder: categories.length })} className="text-sm font-medium text-blue-600">+ Add category</button>
      </div>
      <ul className="flex flex-col divide-y divide-slate-100">
        {categories.map((c) => (
          <li key={c.id} className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`font-medium ${c.active ? "text-slate-900" : "text-slate-400 line-through"}`}>{c.nameEn} · {c.nameAr}</span>
              <span className="font-mono text-xs text-slate-400">{c.key}</span>
              <span className="ms-auto flex gap-3 text-xs">
                <button type="button" onClick={() => setCat({ id: c.id, key: c.key, nameEn: c.nameEn, nameAr: c.nameAr, active: c.active, sortOrder: c.sortOrder })} className="text-blue-600">Edit</button>
                <button type="button" onClick={() => setField(blankField(c.id, c.fields.length))} className="text-blue-600">+ Field</button>
                <button type="button" onClick={() => { if (window.confirm(`Delete “${c.nameEn}”?`)) run(() => deleteCategory(c.id), "Category deleted"); }} className="text-red-600">Delete</button>
              </span>
            </div>
            {c.fields.length > 0 && (
              <ul className="mt-2 ms-4 flex flex-col gap-1 text-sm text-slate-600">
                {c.fields.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-2">
                    <span>↳ {f.labelEn} · {f.labelAr}</span>
                    <span className="text-xs text-slate-400">{f.inputType}{f.options.length ? ` (${f.options.length})` : ""} · {f.appliesTo.join("/").toLowerCase()}{f.required ? " · required" : ""}{f.showInAd ? " · in ad" : ""}</span>
                    <span className="ms-auto flex gap-3 text-xs"><button type="button" onClick={() => setField(toDraft(f, c.id))} className="text-blue-600">Edit</button><button type="button" onClick={() => { if (window.confirm(`Delete the field “${f.labelEn}”?`)) run(() => deleteCategoryField(f.id), "Field deleted"); }} className="text-red-600">Delete</button></span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {cat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="mb-3 text-base font-bold text-slate-900">{cat.id ? "Edit category" : "New category"}</h3>
            <div className="flex flex-col gap-2">
              <input className={inputClassName} placeholder="Name (English)" value={cat.nameEn} onChange={(e) => setCat({ ...cat, nameEn: e.target.value, ...(cat.id ? {} : { key: slugKey(e.target.value) }) })} />
              <input className={inputClassName} dir="rtl" placeholder="الاسم (Arabic)" value={cat.nameAr} onChange={(e) => setCat({ ...cat, nameAr: e.target.value })} />
              <input className={inputClassName} dir="ltr" placeholder="key (letters, numbers, hyphens)" value={cat.key} disabled={!!cat.id} onChange={(e) => setCat({ ...cat, key: slugKey(e.target.value) })} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cat.active} onChange={(e) => setCat({ ...cat, active: e.target.checked })} /> Active (can be chosen for new jobs)</label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setCat(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button type="button" disabled={pending} onClick={() => run(() => saveCategory(cat), "Category saved", () => setCat(null))} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {field && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6">
            <h3 className="mb-3 text-base font-bold text-slate-900">{field.id ? "Edit field" : "New field"}</h3>
            <div className="flex flex-col gap-2">
              <input className={inputClassName} placeholder="Label (English)" value={field.labelEn} onChange={(e) => setField({ ...field, labelEn: e.target.value, ...(field.id ? {} : { key: e.target.value.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string) => (c ?? "").toUpperCase()).replace(/^./, (c) => c.toLowerCase()) }) })} />
              <input className={inputClassName} dir="rtl" placeholder="العنوان (Arabic)" value={field.labelAr} onChange={(e) => setField({ ...field, labelAr: e.target.value })} />
              <input className={inputClassName} dir="ltr" placeholder="key (e.g. paintFinish)" value={field.key} disabled={!!field.id} onChange={(e) => setField({ ...field, key: e.target.value })} />
              <select className={inputClassName} value={field.inputType} onChange={(e) => setField({ ...field, inputType: e.target.value as FieldDraft["inputType"] })} aria-label="Input type"><option value="select">Choice list</option><option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes / No</option></select>
              <div className="flex gap-4 text-sm">
                {(["PERMANENT", "DAILY"] as const).map((t) => <label key={t} className="flex items-center gap-1.5"><input type="checkbox" checked={field.appliesTo.includes(t)} onChange={(e) => setField({ ...field, appliesTo: e.target.checked ? [...field.appliesTo, t] : field.appliesTo.filter((x) => x !== t) })} /> {t === "DAILY" ? "Daily jobs" : "Permanent jobs"}</label>)}
              </div>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={field.required} onChange={(e) => setField({ ...field, required: e.target.checked })} /> Required to publish</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={field.showInAd} onChange={(e) => setField({ ...field, showInAd: e.target.checked })} /> Show in WhatsApp text</label>
              </div>
              {field.inputType === "select" && (
                <div className="mt-1 rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">Choices</p>
                  {field.options.map((o, i) => (
                    <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                      <input className={inputClassName} value={o.labelEn} placeholder="English" onChange={(e) => setField({ ...field, options: field.options.map((x, j) => (j === i ? { ...x, labelEn: e.target.value, value: x.value || slugKey(e.target.value) } : x)) })} />
                      <input className={inputClassName} dir="rtl" value={o.labelAr} placeholder="العربية" onChange={(e) => setField({ ...field, options: field.options.map((x, j) => (j === i ? { ...x, labelAr: e.target.value } : x)) })} />
                      <input className={inputClassName} dir="ltr" value={o.value} placeholder="value" onChange={(e) => setField({ ...field, options: field.options.map((x, j) => (j === i ? { ...x, value: slugKey(e.target.value) } : x)) })} />
                      <button type="button" onClick={() => setField({ ...field, options: field.options.filter((_, j) => j !== i) })} className="text-xs text-red-600">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setField({ ...field, options: [...field.options, { value: "", labelEn: "", labelAr: "" }] })} className="text-xs font-medium text-blue-600">+ Add choice</button>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setField(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button type="button" disabled={pending} onClick={() => run(() => saveCategoryField(field), "Field saved", () => setField(null))} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
