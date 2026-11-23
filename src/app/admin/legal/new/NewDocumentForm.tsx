"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLegalDocument } from "../doc-actions";

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900";

export function NewDocumentForm({ categories }: { categories: { id: string; key: string; nameEn: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <label className="block text-xs font-medium text-slate-600">Category
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>{categories.map((c) => <option key={c.id} value={c.id}>{c.key} · {c.nameEn}</option>)}</select>
      </label>
      <label className="block text-xs font-medium text-slate-600">Title (English) *<input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={input} /></label>
      <label className="block text-xs font-medium text-slate-600">العنوان (Arabic) *<input dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className={input} /></label>
      <label className="block text-xs font-medium text-slate-600">Address (optional, made from the English title if empty)<input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-new-policy" className={input} /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await createLegalDocument({ categoryId, slug, titleEn, titleAr }); if (r.ok && r.id) router.push(`/admin/legal/${r.id}/edit`); else setError(r.error ?? "Something went wrong."); })} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Creating…" : "Create draft"}</button>
    </div>
  );
}
