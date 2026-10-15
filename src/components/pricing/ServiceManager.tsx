"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { saveService, type ServiceInput } from "@/app/admin/pricing/actions";
import { SERVICE_NOTE_MAX } from "@/lib/pricing/serviceNote";
import { OptionsEditor, type OptionItem } from "@/components/pricing/OptionsEditor";

export type ServiceRow = ServiceInput & { id: string; slug: string; options: OptionItem[] };

const UNITS = ["AC_UNIT", "UNIT", "ROOM", "AREA_SQM", "VISIT", "FIXED"];
const empty: ServiceInput = {
  nameEn: "",
  nameAr: "",
  pricingUnit: "UNIT",
  minQuantity: "1",
  active: true,
  discountRuleSetId: "",
  pricesIncludeVat: "",
  noteEn: "",
  noteAr: "",
  optionLabelEn: "",
  optionLabelAr: "",
};

function ServiceForm({
  id,
  initial,
  ruleSets,
  options = [],
  onDone,
}: {
  id: string | null;
  initial: ServiceInput;
  ruleSets: { id: string; name: string }[];
  options?: OptionItem[];
  onDone: () => void;
}) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveService(id, v);
      if (res.ok) {
        showToast(id ? "Service updated." : "Service added.");
        onDone();
      } else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name (English) *">
          <input className={inputClassName} value={v.nameEn} onChange={(e) => setV({ ...v, nameEn: e.target.value })} />
        </Field>
        <Field label="الاسم (Arabic) *" dir="rtl">
          <input className={inputClassName} dir="rtl" value={v.nameAr} onChange={(e) => setV({ ...v, nameAr: e.target.value })} />
        </Field>
        <Field label="Pricing unit">
          <select className={inputClassName} value={v.pricingUnit} onChange={(e) => setV({ ...v, pricingUnit: e.target.value })}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Minimum quantity">
          <input className={inputClassName} inputMode="numeric" value={v.minQuantity} onChange={(e) => setV({ ...v, minQuantity: e.target.value })} />
        </Field>
        <Field label="Discount rule set">
          <select className={inputClassName} value={v.discountRuleSetId} onChange={(e) => setV({ ...v, discountRuleSetId: e.target.value })}>
            <option value="">No discount</option>
            {ruleSets.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prices include VAT">
          <select
            className={inputClassName}
            value={v.pricesIncludeVat}
            onChange={(e) => setV({ ...v, pricesIncludeVat: e.target.value as ServiceInput["pricesIncludeVat"] })}
          >
            <option value="">Use global setting</option>
            <option value="true">Yes, inclusive</option>
            <option value="false">No, add VAT on top</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Note for customers (English), optional">
          <textarea className={`${inputClassName} min-h-20`} maxLength={SERVICE_NOTE_MAX} value={v.noteEn} onChange={(e) => setV({ ...v, noteEn: e.target.value })} placeholder="e.g. Repair only. Spare parts are not included." />
        </Field>
        <Field label="ملاحظة للعملاء (Arabic) - اختياري" dir="rtl">
          <textarea className={`${inputClassName} min-h-20`} dir="rtl" maxLength={SERVICE_NOTE_MAX} value={v.noteAr} onChange={(e) => setV({ ...v, noteAr: e.target.value })} placeholder="مثال: الإصلاح فقط، ولا يشمل قطع الغيار." />
        </Field>
        <p className="text-xs text-slate-500 sm:col-span-2">Shown with the service on the price calculator and in the booking summary, so customers see what the price covers. Leave empty for no note.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
        Active (bookable)
      </label>
      {id && options.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Question above the options (English), optional">
            <input className={inputClassName} maxLength={80} value={v.optionLabelEn} onChange={(e) => setV({ ...v, optionLabelEn: e.target.value })} placeholder="e.g. What do you need?  (default: Choose an option)" />
          </Field>
          <Field label="السؤال فوق الخيارات (Arabic) - اختياري" dir="rtl">
            <input className={inputClassName} dir="rtl" maxLength={80} value={v.optionLabelAr} onChange={(e) => setV({ ...v, optionLabelAr: e.target.value })} placeholder="مثال: ماذا تحتاج؟" />
          </Field>
          <p className="text-xs text-slate-500 sm:col-span-2">Saved with the Save button below.</p>
        </div>
      )}
      {id ? <OptionsEditor serviceId={id} options={options} /> : <p className="text-xs text-slate-400">Save the service first, then you can add options (for example weights for a gas refill).</p>}
      <div className="flex gap-3">
        <button type="button" disabled={pending} onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : id ? "Save" : "Add service"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ServiceManager({ services, ruleSets }: { services: ServiceRow[]; ruleSets: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {services.map((s) =>
        editing === s.id ? (
          <ServiceForm key={s.id} id={s.id} initial={s} ruleSets={ruleSets} options={s.options} onDone={() => setEditing(null)} />
        ) : (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <div>
              <span className="font-medium text-slate-900">{s.nameEn}</span>
              <span className="ml-2 text-slate-400" dir="rtl">{s.nameAr}</span>
              <span className="ml-3 text-xs text-slate-500">
                {s.pricingUnit} · min {s.minQuantity}{s.options.length ? ` · ${s.options.length} option${s.options.length === 1 ? "" : "s"}` : ""}
                {s.discountRuleSetId ? ` · ${ruleSets.find((r) => r.id === s.discountRuleSetId)?.name ?? "discount"}` : ""}
              </span>
              {!s.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
              {(s.noteEn || s.noteAr) && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700" title={s.noteEn || s.noteAr}>note</span>}
            </div>
            <button type="button" onClick={() => setEditing(s.id)} className="font-medium text-blue-600">
              Edit
            </button>
          </div>
        )
      )}
      {editing === "new" ? (
        <ServiceForm id={null} initial={empty} ruleSets={ruleSets} onDone={() => setEditing(null)} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="self-start text-sm font-medium text-blue-600">
          + Add service
        </button>
      )}
    </div>
  );
}
