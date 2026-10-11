"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { createAreaPage, deleteArea, saveArea, type AreaInput } from "@/app/admin/website/area-actions";

export type AreaRow = AreaInput & { id: string; regionName: string; pageId: string | null; pageStatus: string | null };
type Option = { id: string; name: string };

const blank = (regionId: string): AreaInput => ({ regionId, slug: "", nameEn: "", nameAr: "", kind: "area", latitude: "", longitude: "", mapsUrl: "", active: true, serviceIds: [] });

function AreaForm({ id, initial, regions, services, onDone }: { id: string | null; initial: AreaInput; regions: Option[]; services: Option[]; onDone: () => void }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (p: Partial<AreaInput>) => setV((s) => ({ ...s, ...p }));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name (English) *"><input className={inputClassName} value={v.nameEn} onChange={(e) => set({ nameEn: e.target.value })} /></Field>
        <Field label="الاسم (Arabic) *" dir="rtl"><input className={inputClassName} dir="rtl" value={v.nameAr} onChange={(e) => set({ nameAr: e.target.value })} /></Field>
        <Field label="Slug *"><input className={inputClassName} dir="ltr" value={v.slug} onChange={(e) => set({ slug: e.target.value })} /></Field>
        <Field label="Emirate *">
          <select className={inputClassName} value={v.regionId} onChange={(e) => set({ regionId: e.target.value })}>
            {regions.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        </Field>
        <Field label="Type">
          <select className={inputClassName} value={v.kind} onChange={(e) => set({ kind: e.target.value as AreaInput["kind"] })}>
            <option value="emirate">Whole emirate</option>
            <option value="area">Area / city inside an emirate</option>
          </select>
        </Field>
        <Field label="Google Maps link"><input className={inputClassName} dir="ltr" placeholder="https://maps.google.com/…" value={v.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} /></Field>
        <Field label="Latitude"><input className={inputClassName} dir="ltr" inputMode="decimal" placeholder="25.4052" value={v.latitude} onChange={(e) => set({ latitude: e.target.value })} /></Field>
        <Field label="Longitude"><input className={inputClassName} dir="ltr" inputMode="decimal" placeholder="55.5136" value={v.longitude} onChange={(e) => set({ longitude: e.target.value })} /></Field>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-600">Services offered here</p>
        <div className="flex flex-wrap gap-4">
          {services.length === 0 && <span className="text-xs text-slate-400">No bookable services yet.</span>}
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input type="checkbox" checked={v.serviceIds.includes(s.id)} onChange={(e) => set({ serviceIds: e.target.checked ? [...v.serviceIds, s.id] : v.serviceIds.filter((x) => x !== s.id) })} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={v.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
      <p className="text-xs text-slate-400">Phone, address and hours come from Site &amp; Contact, so they are always the same everywhere.</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await saveArea(id, v);
              if (res.ok) {
                showToast(id ? "Area saved." : "Area added.");
                onDone();
              } else setError(res.error ?? "Could not save.");
            })
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
      </div>
    </div>
  );
}

export function AreaManager({ areas, regions, services }: { areas: AreaRow[]; regions: Option[]; services: Option[] }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  function makePage(areaId: string) {
    startTransition(async () => {
      const res = await createAreaPage(areaId);
      if (res.ok && res.id) router.push(`/admin/website/pages/${res.id}`);
      else showToast(res.error ?? "Could not create the page.", "error");
    });
  }

  return (
    <div className="flex max-w-4xl flex-col gap-3">
      {areas.map((a) =>
        editing === a.id ? (
          <AreaForm key={a.id} id={a.id} initial={a} regions={regions} services={services} onDone={() => setEditing(null)} />
        ) : (
          <div key={a.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${a.active ? "" : "opacity-60"}`}>
            <div>
              <span className="font-medium text-slate-900">{a.nameEn}</span>
              <span className="ml-2 text-slate-400" dir="rtl">{a.nameAr}</span>
              <span className="ml-3 text-xs text-slate-500">{a.kind === "emirate" ? "Emirate" : `Area in ${a.regionName}`} · {a.serviceIds.length} service{a.serviceIds.length === 1 ? "" : "s"}{a.latitude ? " · has map location" : ""}</span>
            </div>
            <div className="flex items-center gap-4">
              {a.pageId ? (
                <Link href={`/admin/website/pages/${a.pageId}`} className="font-medium text-emerald-700">Page: {a.pageStatus?.toLowerCase()}</Link>
              ) : (
                <button type="button" disabled={pending} onClick={() => makePage(a.id)} className="font-medium text-blue-600 disabled:opacity-50">Create page</button>
              )}
              <button type="button" onClick={() => setEditing(a.id)} className="font-medium text-slate-600">Edit</button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Delete ${a.nameEn}?`)) return;
                  const res = await deleteArea(a.id);
                  showToast(res.ok ? "Area deleted." : res.error ?? "Failed.", res.ok ? "success" : "error");
                  if (res.ok) router.refresh();
                }}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}
      {editing === "new" ? (
        <AreaForm id={null} initial={blank(regions[0]?.id ?? "")} regions={regions} services={services} onDone={() => { setEditing(null); router.refresh(); }} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="self-start text-sm font-medium text-blue-600">+ Add area</button>
      )}
    </div>
  );
}
