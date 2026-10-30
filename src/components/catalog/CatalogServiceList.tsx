"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { deleteCatalogService, duplicateCatalogService, moveCatalogService, setCatalogCategoryServicesActive, setCatalogServiceActive } from "@/app/admin/catalog/actions";

export type ServiceRow = { id: string; slug: string; nameEn: string; nameAr: string; groupEn: string | null; active: boolean; others: string[] };

export function CatalogServiceList({ categoryId, rows }: { categoryId: string; rows: ServiceRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? rows.filter((r) => `${r.nameEn} ${r.nameAr} ${r.slug}`.toLowerCase().includes(needle)) : rows;
  }, [rows, q]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (success) showToast(success);
        router.refresh();
      } else showToast(r.error ?? "Something went wrong.", "error");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/admin/catalog/service/new?category=${categoryId}`} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">+ Add service</Link>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter this list…" className="w-60 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" />
        <button type="button" disabled={pending || rows.length === 0} onClick={() => { if (confirm(`Activate all ${rows.length} services of this category?`)) run(() => setCatalogCategoryServicesActive(categoryId, true), "All services activated."); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:opacity-50">Activate all</button>
        <button type="button" disabled={pending || rows.length === 0} onClick={() => { if (confirm(`Deactivate all ${rows.length} services of this category?`)) run(() => setCatalogCategoryServicesActive(categoryId, false), "All services deactivated."); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:opacity-50">Deactivate all</button>
        <span className="text-xs text-slate-500">{shown.length} of {rows.length}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr><th className="px-3 py-3">Order</th><th className="px-3 py-3">Service</th><th className="px-3 py-3">Also in</th><th className="px-3 py-3">Status</th><th className="px-3 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No services.</td></tr>}
            {shown.map((s) => {
              const i = rows.findIndex((r) => r.id === s.id);
              return (
                <tr key={s.id} className={s.active ? "" : "bg-slate-50 text-slate-500"}>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button type="button" aria-label="Move up" disabled={pending || i === 0 || !!q} onClick={() => run(() => moveCatalogService(categoryId, s.id, "up"))} className="px-1 text-slate-500 disabled:opacity-30">▲</button>
                      <button type="button" aria-label="Move down" disabled={pending || i === rows.length - 1 || !!q} onClick={() => run(() => moveCatalogService(categoryId, s.id, "down"))} className="px-1 text-slate-500 disabled:opacity-30">▼</button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/catalog/service/${s.id}`} className="font-medium text-slate-900 hover:text-blue-700">{s.nameEn}</Link>
                    <p className="text-xs text-slate-500" dir="rtl">{s.nameAr}</p>
                    {s.groupEn && <p className="text-[11px] text-slate-400">{s.groupEn}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{s.others.join(" · ")}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" disabled={pending} onClick={() => run(() => setCatalogServiceActive(s.id, !s.active))} className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.active ? "Active" : "Inactive"}</button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <Link href={`/admin/catalog/service/${s.id}`} className="text-blue-600">Edit</Link>
                      <button type="button" disabled={pending} onClick={() => run(() => duplicateCatalogService(s.id), "Service duplicated (inactive).")} className="text-slate-600">Duplicate</button>
                      <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete “${s.nameEn}”? This can't be undone.`)) run(() => deleteCatalogService(s.id), "Service deleted."); }} className="text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
