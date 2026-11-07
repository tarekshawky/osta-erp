"use client";

import { useState } from "react";
import { inputClassName } from "@/components/FormField";
import { deleteOption, loadStandardOptions, saveBuilder, saveOption, type OptionInput } from "@/app/admin/website/maintenance-actions";
import { btn, label, useRun } from "@/components/cms/maintenanceUi";
import { FIELD_KEYS, MESSAGE_KEYS, type BuilderConfig, type FieldKey, type FieldMode, type MessageKey } from "@/lib/maintenance/builder";

type Opt = { id: string; groupId: string | null; category: string; nameEn: string; nameAr: string; serviceId: string | null; extraPrice: number | null; upgradeTrigger: boolean; active: boolean };
type Svc = { id: string; nameEn: string; nameAr: string };

const FIELD_LABEL: Record<FieldKey, string> = { whatsapp: "WhatsApp number", area: "Area", address: "Property address", bedrooms: "Number of bedrooms", bathrooms: "Number of bathrooms", floors: "Number of floors", size: "Property size (sqm)", acUnits: "Number of AC units" };
const MESSAGE_LABEL: Record<MessageKey, string> = { ac: "Too many AC units", service: "A service is in a higher package", handyman: "More handyman hours than the package", best: "Best package recommendation", exceeds: "Needs beyond every package" };
const MESSAGE_VARS: Record<MessageKey, string> = { ac: "{units} {covered} {package} {max}", service: "{service} {package}", handyman: "{hours} {included} {package}", best: "{package}", exceeds: "" };

// The Smart Package Builder settings of one group: on/off, the live price summary, the form fields, property types, the prices of extras,
// the warning messages, and the list of requirements a customer can tick (each linked to the package service it belongs to).
export function BuilderAdmin({ groupId, config: initial, options, services }: { groupId: string | null; config: BuilderConfig; options: Opt[]; services: Svc[] }) {
  const { run, pending } = useRun();
  const [c, setC] = useState<BuilderConfig>(initial);
  const [edit, setEdit] = useState<(OptionInput & { id: string | null; price: string }) | null>(null);
  const set = (patch: Partial<BuilderConfig>) => setC((x) => ({ ...x, ...patch }));
  const mine = options.filter((o) => o.groupId === groupId);
  const svcName = (id: string | null) => services.find((s) => s.id === id)?.nameEn ?? "—";

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-900">Smart Package Builder</p>
        <p className="mb-3 text-xs text-slate-500">When it is on, the package buttons open a guided form: property details, the requirements the customer ticks, upgrade suggestions based on what each package really includes, and a live price. Leave it off to keep the simple form.</p>
        <div className="flex flex-wrap gap-6 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={c.enabled} onChange={(e) => set({ enabled: e.target.checked })} />Switch the builder on for this set of packages</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={c.calculator} onChange={(e) => set({ calculator: e.target.checked })} />Show the live price summary</label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Form fields</p>
          <p className="mb-3 text-xs text-slate-500">Name, mobile, email and emirate are always asked. Choose what else to ask.</p>
          <div className="flex flex-col gap-2">
            {FIELD_KEYS.map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm text-slate-700">{FIELD_LABEL[k]}
                <select className={`${inputClassName} !w-36`} value={c.fields[k]} onChange={(e) => set({ fields: { ...c.fields, [k]: e.target.value as FieldMode } })}><option value="off">Not asked</option><option value="optional">Optional</option><option value="required">Required</option></select>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Property types</p>
          <div className="flex flex-col gap-2">
            {c.propertyTypes.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputClassName} value={t.en} placeholder="English" aria-label="Property type in English" onChange={(e) => set({ propertyTypes: c.propertyTypes.map((x, j) => (j === i ? { ...x, en: e.target.value, key: x.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : x)) })} />
                <input className={inputClassName} dir="rtl" value={t.ar} placeholder="العربية" aria-label="Property type in Arabic" onChange={(e) => set({ propertyTypes: c.propertyTypes.map((x, j) => (j === i ? { ...x, ar: e.target.value } : x)) })} />
                <button type="button" className={`${btn} !text-red-600`} aria-label="Remove property type" disabled={c.propertyTypes.length <= 1} onClick={() => set({ propertyTypes: c.propertyTypes.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className={`${btn} mt-2`} onClick={() => set({ propertyTypes: [...c.propertyTypes, { key: `type-${c.propertyTypes.length + 1}`, en: "", ar: "" }] })}>+ Add property type</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-900">Extra services and their prices</p>
        <p className="mb-3 text-xs text-slate-500">What a customer can add outside the package. Only prices set here are ever added to the total; an extra with no price is sent as a quotation request with no amount.</p>
        <div className="flex flex-col gap-2">
          {c.extras.map((x, i) => {
            const upd = (patch: Partial<typeof x>) => set({ extras: c.extras.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
            return (
              <div key={x.key} className="grid items-center gap-2 sm:grid-cols-[auto_1.3fr_1.3fr_0.8fr_0.8fr_0.8fr]">
                <input type="checkbox" checked={x.enabled} onChange={(e) => upd({ enabled: e.target.checked })} aria-label={`${x.nameEn} enabled`} />
                <input className={inputClassName} value={x.nameEn} onChange={(e) => upd({ nameEn: e.target.value })} aria-label="Name in English" />
                <input className={inputClassName} dir="rtl" value={x.nameAr} onChange={(e) => upd({ nameAr: e.target.value })} aria-label="Name in Arabic" />
                <input className={inputClassName} value={x.unitEn} placeholder="per unit" onChange={(e) => upd({ unitEn: e.target.value })} aria-label="Unit in English" />
                <input className={inputClassName} dir="rtl" value={x.unitAr} placeholder="للوحدة" onChange={(e) => upd({ unitAr: e.target.value })} aria-label="Unit in Arabic" />
                <input className={inputClassName} inputMode="decimal" dir="ltr" value={x.unitPrice ?? ""} placeholder="AED (empty = quote)" onChange={(e) => upd({ unitPrice: e.target.value.trim() === "" ? null : Number(e.target.value) })} aria-label={`${x.nameEn} price`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-900">Warning and recommendation messages</p>
        <p className="mb-3 text-xs text-slate-500">Edit the wording in both languages. Keep the {"{placeholders}"}: they are replaced with the customer&apos;s numbers and the package names.</p>
        <div className="flex flex-col gap-4">
          {MESSAGE_KEYS.map((k) => (
            <div key={k}>
              <p className="mb-1 text-xs font-semibold text-slate-600">{MESSAGE_LABEL[k]} {MESSAGE_VARS[k] && <span className="font-normal text-slate-400">· {MESSAGE_VARS[k]}</span>}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <textarea className={`${inputClassName} resize-y`} rows={3} value={c.messages[k].en} onChange={(e) => set({ messages: { ...c.messages, [k]: { ...c.messages[k], en: e.target.value } } })} aria-label={`${MESSAGE_LABEL[k]} in English`} />
                <textarea className={`${inputClassName} resize-y`} rows={3} dir="rtl" value={c.messages[k].ar} onChange={(e) => set({ messages: { ...c.messages, [k]: { ...c.messages[k], ar: e.target.value } } })} aria-label={`${MESSAGE_LABEL[k]} in Arabic`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="button" disabled={pending} onClick={() => run(() => saveBuilder(groupId, c), "Builder settings saved.")} className="self-start rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save builder settings"}</button>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-900">Requirements the customer can tick ({mine.length})</p>
          <button type="button" className={`${btn} ml-auto`} onClick={() => setEdit({ id: null, groupId, category: c.categories[0]?.key ?? "general", nameEn: "", nameAr: "", serviceId: null, extraPrice: null, price: "", upgradeTrigger: true, active: true })}>+ Add requirement</button>
        </div>
        <p className="mb-3 text-xs text-slate-500">Link each one to the package service it belongs to: a package that includes that service covers it at no charge. One not linked to any service is always an extra (priced here, or a quotation request). “Suggest an upgrade” makes the builder recommend a package that includes it.</p>
        {mine.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center">
            <p className="mb-2 text-sm text-slate-500">No requirements yet.</p>
            <button type="button" disabled={pending} onClick={() => run(() => loadStandardOptions(groupId), "The standard requirements were loaded.")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Load the standard requirements</button>
            <p className="mt-2 text-xs text-slate-400">AC, plumbing, electrical and handyman, linked by name to this group&apos;s services (add services first).</p>
          </div>
        )}
        {c.categories.map((cat) => {
          const items = mine.filter((o) => o.category === cat.key);
          if (items.length === 0) return null;
          return (
            <div key={cat.key} className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{cat.en}</p>
              {items.map((o) => (
                <div key={o.id} className={`flex flex-wrap items-center gap-2 border-b border-slate-50 py-1.5 text-sm ${o.active ? "" : "opacity-50"}`}>
                  <span className="min-w-0 flex-1"><span className="font-medium text-slate-900">{o.nameEn}</span> <span className="text-slate-400" dir="rtl">{o.nameAr}</span></span>
                  <span className="text-xs text-slate-500">{o.serviceId ? `in: ${svcName(o.serviceId)}` : "extra"}{o.extraPrice != null ? ` · AED ${o.extraPrice}` : ""}</span>
                  <button type="button" className={btn} onClick={() => setEdit({ ...o, id: o.id, price: o.extraPrice == null ? "" : String(o.extraPrice) })}>Edit</button>
                  <button type="button" className={`${btn} !text-red-600`} disabled={pending} onClick={() => { if (confirm(`Delete “${o.nameEn}”?`)) run(() => deleteOption(o.id), "Deleted."); }}>Delete</button>
                </div>
              ))}
            </div>
          );
        })}
        {edit && (
          <div className="mt-3 grid gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><span className={label}>Name (English) *</span><input className={inputClassName} value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className={label}>الاسم (Arabic) *</span><input className={inputClassName} dir="rtl" value={edit.nameAr} onChange={(e) => setEdit({ ...edit, nameAr: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className={label}>Section</span><select className={inputClassName} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{c.categories.map((x) => <option key={x.key} value={x.key}>{x.en}</option>)}</select></label>
            <label className="flex flex-col gap-1.5"><span className={label}>Part of this package service</span><select className={inputClassName} value={edit.serviceId ?? ""} onChange={(e) => setEdit({ ...edit, serviceId: e.target.value || null })}><option value="">None (always an extra)</option>{services.map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}</select></label>
            <label className="flex flex-col gap-1.5"><span className={label}>Price when it is an extra, AED (empty = quotation)</span><input className={inputClassName} inputMode="decimal" dir="ltr" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></label>
            <div className="flex flex-col justify-end gap-2 text-sm text-slate-700">
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.upgradeTrigger} onChange={(e) => setEdit({ ...edit, upgradeTrigger: e.target.checked })} />Suggest an upgrade when the package does not include it</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Shown to customers</label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => run(() => saveOption(edit.id, { ...edit, extraPrice: edit.price.trim() === "" ? null : Number(edit.price) }), "Saved.", () => setEdit(null))}>Save requirement</button>
              <button type="button" className={btn} onClick={() => setEdit(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
