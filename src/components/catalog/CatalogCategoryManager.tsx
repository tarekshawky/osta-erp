"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { SeoFields } from "@/components/catalog/SeoFields";
import { createCatalogWebsitePages, deleteCatalogCategory, importCatalogServicesCsv, moveCatalogCategory, saveCatalogCategory, setCatalogCategoryActive, type ImportResult } from "@/app/admin/catalog/actions";
import { ICON_NAMES } from "@/lib/cms/icons";
import type { CategoryInput } from "@/lib/catalog/rules";

export type CategoryRow = CategoryInput & { id: string; total: number; activeCount: number };
const empty: CategoryInput = {
  code: "", slug: "", nameEn: "", nameAr: "", shortDescriptionEn: "", shortDescriptionAr: "", descriptionEn: "", descriptionAr: "", iconName: "", imageUrl: "", active: false,
  seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", seoKeywordsEn: "", seoKeywordsAr: "", canonicalUrl: "",
};
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CatalogCategoryManager({ rows, serviceCount }: { rows: CategoryRow[]; serviceCount: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<{ id: string | null; data: CategoryInput } | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
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
      const r = await saveCatalogCategory(editing.id, editing.data);
      if (r.ok) {
        showToast(editing.id ? "Category saved." : "Category created.");
        setEditing(null);
        router.refresh();
      } else setError(r.error ?? "Could not save.");
    });
  }

  function importFile(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      const text = await file.text();
      const r = await importCatalogServicesCsv(text);
      setImported(r);
      if (r.ok) {
        showToast(`Import done: ${r.created} added, ${r.updated} updated.`);
        router.refresh();
      } else showToast(r.error ?? "Import failed.", "error");
    });
  }

  function createPages() {
    if (!confirm("Create a draft website page for every category and every service that doesn't have one yet?\n\nThey are drafts (nobody sees them until you publish) and appear under Website → Page Structure: each category page with its services beneath it.")) return;
    startTransition(async () => {
      const r = await createCatalogWebsitePages();
      if (r.ok && r.result) {
        showToast(`Created ${r.result.categoriesCreated} category pages and ${r.result.servicesCreated} service pages (drafts).`);
        router.refresh();
      } else showToast(r.error ?? "Could not create the pages.", "error");
    });
  }

  const set = (patch: Partial<CategoryInput>) => setEditing((e) => (e ? { ...e, data: { ...e.data, ...patch } } : e));

  return (
    <div className="flex flex-col gap-5">
      {!editing && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setEditing({ id: null, data: empty }); setSlugTouched(false); setError(null); }} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">+ New category</button>
          <a href="/api/admin/catalog/export" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">Export services (CSV)</a>
          <button type="button" disabled={pending} onClick={createPages} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50">Create website pages</button>
          <label className={`cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ${pending ? "opacity-50" : ""}`}>
            {pending ? "Working…" : "Import services (CSV)"}
            <input type="file" accept=".csv,text/csv" className="sr-only" disabled={pending} onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <span className="text-xs text-slate-500">{rows.length} categories · {serviceCount} services. The CSV columns are the same as the export; open it in Excel and save as CSV (UTF-8).</span>
        </div>
      )}

      {imported && (
        <div className={`max-w-3xl rounded-xl border p-4 text-sm ${imported.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}>
          <p className="font-semibold">{imported.ok ? `${imported.created} added, ${imported.updated} updated${imported.issues.length ? `, ${imported.issues.length} skipped` : ""}.` : imported.error}</p>
          {imported.issues.length > 0 && (
            <ul className="mt-2 max-h-48 list-disc overflow-auto ps-5 text-xs">
              {imported.issues.slice(0, 100).map((i, n) => <li key={n}>Line {i.line}: {i.message}</li>)}
              {imported.issues.length > 100 && <li>…and {imported.issues.length - 100} more</li>}
            </ul>
          )}
          <button type="button" onClick={() => setImported(null)} className="mt-2 text-xs font-medium underline">Dismiss</button>
        </div>
      )}

      {editing && (
        <div className="flex max-w-4xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-900">{editing.id ? "Edit category" : "New category"}</h3>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-[6rem_1fr_1fr]">
            <Field label="Number"><input className={inputClassName} dir="ltr" value={editing.data.code} onChange={(e) => set({ code: e.target.value })} placeholder="01" /></Field>
            <Field label="Name (English) *"><input className={inputClassName} value={editing.data.nameEn} onChange={(e) => { const nameEn = e.target.value; set({ nameEn, ...(slugTouched || editing.id ? {} : { slug: toSlug(nameEn) }) }); }} /></Field>
            <Field label="الاسم (Arabic) *" dir="rtl"><input className={inputClassName} dir="rtl" value={editing.data.nameAr} onChange={(e) => set({ nameAr: e.target.value })} /></Field>
          </div>
          <Field label="SEO URL slug *"><input className={inputClassName} dir="ltr" value={editing.data.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Short description (English)"><textarea className={`${inputClassName} min-h-16`} value={editing.data.shortDescriptionEn} onChange={(e) => set({ shortDescriptionEn: e.target.value })} /></Field>
            <Field label="وصف مختصر (Arabic)" dir="rtl"><textarea className={`${inputClassName} min-h-16`} dir="rtl" value={editing.data.shortDescriptionAr} onChange={(e) => set({ shortDescriptionAr: e.target.value })} /></Field>
            <Field label="Full description (English)"><textarea className={`${inputClassName} min-h-28`} value={editing.data.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} /></Field>
            <Field label="الوصف الكامل (Arabic)" dir="rtl"><textarea className={`${inputClassName} min-h-28`} dir="rtl" value={editing.data.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Icon">
              <select className={inputClassName} value={editing.data.iconName} onChange={(e) => set({ iconName: e.target.value })}>
                <option value="">None</option>
                {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <ImageUploadField label="Image (optional)" value={editing.data.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
          </div>
          <SeoFields value={editing.data} onChange={(p) => set(p)} slugHint="The slug above is the address of the category page." />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={editing.data.active} onChange={(e) => set({ active: e.target.checked })} /> Active
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
            <tr><th className="px-3 py-3">Order</th><th className="px-3 py-3">#</th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Services</th><th className="px-3 py-3">Status</th><th className="px-3 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No categories yet.</td></tr>}
            {rows.map((c, i) => (
              <tr key={c.id} className={c.active ? "" : "bg-slate-50 text-slate-500"}>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={pending || i === 0} onClick={() => run(() => moveCatalogCategory(c.id, "up"))} className="px-1 text-slate-500 disabled:opacity-30">▲</button>
                    <button type="button" aria-label="Move down" disabled={pending || i === rows.length - 1} onClick={() => run(() => moveCatalogCategory(c.id, "down"))} className="px-1 text-slate-500 disabled:opacity-30">▼</button>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-400">{c.code}</td>
                <td className="px-3 py-3">
                  <Link href={`/admin/catalog/category/${c.id}`} className="font-medium text-slate-900 hover:text-blue-700">{c.nameEn}</Link>
                  <p className="text-xs text-slate-500" dir="rtl">{c.nameAr}</p>
                </td>
                <td className="px-3 py-3"><span className="font-medium">{c.total}</span> <span className="text-xs text-slate-400">{c.activeCount} active</span></td>
                <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.active ? "Active" : "Inactive"}</span></td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-3 text-xs font-medium">
                    <Link href={`/admin/catalog/category/${c.id}`} className="text-blue-600">Services</Link>
                    <button type="button" onClick={() => { const { id: _id, total: _t, activeCount: _a, ...data } = c; void _id; void _t; void _a; setEditing({ id: c.id, data }); setSlugTouched(true); setError(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-blue-600">Edit</button>
                    <button type="button" disabled={pending} onClick={() => run(() => setCatalogCategoryActive(c.id, !c.active), c.active ? "Category deactivated." : "Category activated.")} className="text-slate-600">{c.active ? "Deactivate" : "Activate"}</button>
                    <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete “${c.nameEn}”? This can't be undone.`)) run(() => deleteCatalogCategory(c.id), "Category deleted."); }} className="text-red-600">Delete</button>
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
