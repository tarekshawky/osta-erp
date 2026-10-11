"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { saveBookingType, addFeeOverride, deleteFeeOverride, type BookingTypeInput } from "@/app/admin/pricing/actions";

type Option = { id: string; name: string };
export type OverrideRow = { id: string; serviceName: string; regionName: string; feeAed: string };
export type BookingTypeRow = BookingTypeInput & { id: string; code: string; overrides: OverrideRow[] };

function OverrideAdder({ bookingTypeId, services, regions }: { bookingTypeId: string; services: Option[]; regions: Option[] }) {
  const { showToast } = useToast();
  const [serviceId, setServiceId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [fee, setFee] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const res = await addFeeOverride(bookingTypeId, serviceId, regionId, fee);
      if (res.ok) {
        showToast("Override added.");
        setServiceId("");
        setRegionId("");
        setFee("");
      } else showToast(res.error ?? "Could not add.", "error");
    });
  }

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
      <select className={inputClassName} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
        <option value="">Any service</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select className={inputClassName} value={regionId} onChange={(e) => setRegionId(e.target.value)}>
        <option value="">Any emirate</option>
        {regions.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <input className={inputClassName} placeholder="Fee AED" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
      <button type="button" disabled={pending} onClick={add} className="rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 disabled:opacity-50">
        Add
      </button>
    </div>
  );
}

function TypeCard({ row, services, regions }: { row: BookingTypeRow; services: Option[]; regions: Option[] }) {
  const { showToast } = useToast();
  const [v, setV] = useState<BookingTypeInput>(row);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveBookingType(row.id, v);
      if (res.ok) showToast("Booking type saved.");
      else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-semibold text-slate-900">{row.code}</h3>
        {!v.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name (English) *">
          <input className={inputClassName} value={v.nameEn} onChange={(e) => setV({ ...v, nameEn: e.target.value })} />
        </Field>
        <Field label="الاسم (Arabic) *" dir="rtl">
          <input className={inputClassName} dir="rtl" value={v.nameAr} onChange={(e) => setV({ ...v, nameAr: e.target.value })} />
        </Field>
        <Field label="Description (English)">
          <textarea className={`${inputClassName} min-h-16`} value={v.descriptionEn} onChange={(e) => setV({ ...v, descriptionEn: e.target.value })} />
        </Field>
        <Field label="الوصف (Arabic)" dir="rtl">
          <textarea className={`${inputClassName} min-h-16`} dir="rtl" value={v.descriptionAr} onChange={(e) => setV({ ...v, descriptionAr: e.target.value })} />
        </Field>
        <Field label="Default fee (AED)">
          <input className={inputClassName} inputMode="decimal" value={v.feeAed} onChange={(e) => setV({ ...v, feeAed: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours from">
            <input className={inputClassName} placeholder="08:00" value={v.hoursStart} onChange={(e) => setV({ ...v, hoursStart: e.target.value })} />
          </Field>
          <Field label="Hours to">
            <input className={inputClassName} placeholder="22:00" value={v.hoursEnd} onChange={(e) => setV({ ...v, hoursEnd: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={v.sameDayAllowed} onChange={(e) => setV({ ...v, sameDayAllowed: e.target.checked })} />
          Same-day allowed
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
          Active
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button type="button" disabled={pending} onClick={save} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-semibold uppercase text-slate-500">Fee overrides</h4>
        <p className="mb-2 text-xs text-slate-400">Service + emirate wins over service only, which wins over emirate only.</p>
        {row.overrides.length === 0 && <p className="text-sm text-slate-400">None.</p>}
        {row.overrides.map((o) => (
          <div key={o.id} className="flex items-center justify-between py-1 text-sm">
            <span className="text-slate-700">{o.serviceName} · {o.regionName} → <b>{o.feeAed} AED</b></span>
            <button type="button" onClick={async () => { const r = await deleteFeeOverride(o.id); showToast(r.ok ? "Override removed." : r.error ?? "Failed.", r.ok ? "success" : "error"); }} className="text-xs text-red-600">
              Delete
            </button>
          </div>
        ))}
        <OverrideAdder bookingTypeId={row.id} services={services} regions={regions} />
      </div>
    </div>
  );
}

export function BookingTypesEditor({ rows, services, regions }: { rows: BookingTypeRow[]; services: Option[]; regions: Option[] }) {
  return (
    <div className="flex flex-col gap-5">
      {rows.map((r) => (
        <TypeCard key={r.id} row={r} services={services} regions={regions} />
      ))}
    </div>
  );
}
