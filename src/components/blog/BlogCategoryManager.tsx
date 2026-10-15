"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { deleteBlogCategory, moveBlogCategory, saveBlogCategory, setBlogCategoryActive } from "@/app/admin/blog/category-actions";
import type { CategoryInput } from "@/lib/blog/categoryRules";

export type CategoryRow = CategoryInput & { id: string; published: number; total: number };
const empty: CategoryInput = { slug: "", nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", coverImageUrl: "", active: true };
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function BlogCategoryManager({ rows, minIndex }: { rows: CategoryRow[]; minIndex: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<{ id: string | null; data: CategoryInput } | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (success) showToast(success);
        router.refresh();
      } else showToast(r.error ?? "Something went wrong.", "error");
    });
  }

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const r = await saveBlogCategory(editing.id, editing.data);
      if (r.ok) {
        showToast(editing.id ? "Category saved." : "Category created.");
        setEditing(null);
        router.refresh();
      } else setError(r.error ?? "Could not save.");
    });
  }

  const set = (patch: Partial<CategoryInput>) => setEditing((e) => (e ? { ...e, data: { ...e.data, ...patch } } : e));

  return (
    <div className="flex flex-col gap-5">
      {!editing && (
        <button type="button" onClick={() => { setEditing({ id: null, data: empty }); setSlugTouched(false); setError(null); }} className="self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
          + New category
        </button>
      )}

      {editing && (
        <div className="flex max-w-3xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-900">{editing.id ? "Edit category" : "New category"}</h3>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (English) *">
              <input className={inputClassName} value={editing.data.nameEn} onChange={(e) => { const nameEn = e.target.value; set({ nameEn, ...(slugTouched || editing.id ? {} : { slug: toSlug(nameEn) }) }); }} />
            </Field>
            <Field label="الاسم (Arabic) *" dir="rtl">
              <input className={inputClassName} dir="rtl" value={editing.data.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
            </Field>
          </div>
          <Field label="Slug (the address of the category page: /blog/category/…) *">
            <input className={inputClassName} dir="ltr" value={editing.data.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Description (English)">
              <textarea className={`${inputClassName} min-h-20`} value={editing.data.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} />
            </Field>
            <Field label="الوصف (Arabic)" dir="rtl">
              <textarea className={`${inputClassName} min-h-20`} dir="rtl" value={editing.data.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title (English)">
              <input className={inputClassName} value={editing.data.seoTitleEn} onChange={(e) => set({ seoTitleEn: e.target.value })} placeholder="Defaults to the name" />
            </Field>
            <Field label="عنوان السيو (Arabic)" dir="rtl">
              <input className={inputClassName} dir="rtl" value={editing.data.seoTitleAr} onChange={(e) => set({ seoTitleAr: e.target.value })} />
            </Field>
            <Field label="Meta description (English)">
              <textarea className={`${inputClassName} min-h-16`} value={editing.data.seoDescriptionEn} onChange={(e) => set({ seoDescriptionEn: e.target.value })} placeholder="Defaults to the description" />
            </Field>
            <Field label="وصف السيو (Arabic)" dir="rtl">
              <textarea className={`${inputClassName} min-h-16`} dir="rtl" value={editing.data.seoDescriptionAr} onChange={(e) => set({ seoDescriptionAr: e.target.value })} />
            </Field>
          </div>
          <ImageUploadField label="Cover image (optional)" value={editing.data.coverImageUrl} onChange={(coverImageUrl) => set({ coverImageUrl })} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={editing.data.active} onChange={(e) => set({ active: e.target.checked })} /> Active (visible on the website once it has published articles)
          </label>
          <div className="flex gap-3">
            <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save category"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Articles</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No categories yet.</td></tr>}
            {rows.map((c, i) => (
              <tr key={c.id} className={c.active ? "" : "bg-slate-50 text-slate-400"}>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={pending || i === 0} onClick={() => run(() => moveBlogCategory(c.id, "up"))} className="px-1 text-slate-500 disabled:opacity-30">▲</button>
                    <button type="button" aria-label="Move down" disabled={pending || i === rows.length - 1} onClick={() => run(() => moveBlogCategory(c.id, "down"))} className="px-1 text-slate-500 disabled:opacity-30">▼</button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{c.nameEn}</p>
                  <p className="text-xs text-slate-500" dir="rtl">{c.nameAr}</p>
                </td>
                <td className="px-3 py-3 text-slate-500" dir="ltr">/blog/category/{c.slug}</td>
                <td className="px-3 py-3">
                  <span className="font-medium">{c.published}</span> <span className="text-xs text-slate-400">published{c.total !== c.published ? ` · ${c.total} in all` : ""}</span>
                  {c.active && c.published > 0 && c.published < minIndex && <p className="text-[11px] text-amber-600">Not indexed yet: needs {minIndex}+ articles</p>}
                  {c.active && c.published === 0 && <p className="text-[11px] text-slate-400">Hidden on the website until it has an article</p>}
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.active ? "Active" : "Inactive"}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-3 text-xs font-medium">
                    <button type="button" onClick={() => { setEditing({ id: c.id, data: { slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr, seoTitleEn: c.seoTitleEn, seoTitleAr: c.seoTitleAr, seoDescriptionEn: c.seoDescriptionEn, seoDescriptionAr: c.seoDescriptionAr, coverImageUrl: c.coverImageUrl, active: c.active } }); setSlugTouched(true); setError(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-blue-600">Edit</button>
                    <button type="button" disabled={pending} onClick={() => run(() => setBlogCategoryActive(c.id, !c.active), c.active ? "Category deactivated." : "Category activated.")} className="text-slate-600">{c.active ? "Deactivate" : "Activate"}</button>
                    <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete “${c.nameEn}”? This can't be undone.`)) run(() => deleteBlogCategory(c.id), "Category deleted."); }} className="text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
