"use client";

import { CATEGORIES, SERVICE_CATALOG, CUSTOM_SERVICE_VALUE, type Category } from "@/lib/invoiceData";
import { inputClassName } from "@/components/FormField";
import type { ServiceFormData, ServiceItemFormData } from "./types";
import { emptyServiceItem } from "./types";

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  AC: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3M9 6l3-3 3 3M9 18l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Plumbing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3c3 3 6 6.5 6 10a6 6 0 01-12 0c0-3.5 3-7 6-10z" strokeLinejoin="round" />
    </svg>
  ),
  Electrical: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" strokeLinejoin="round" />
    </svg>
  ),
  General: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.5 2.5-2-2 2.5-2.5z" strokeLinejoin="round" />
    </svg>
  ),
};

function updateItem(items: ServiceItemFormData[], index: number, patch: Partial<ServiceItemFormData>) {
  return items.map((it, i) => (i === index ? { ...it, ...patch } : it));
}

export function ServiceStep({
  value,
  onChange,
  onNext,
}: {
  value: ServiceFormData;
  onChange: (value: ServiceFormData) => void;
  onNext: () => void;
}) {
  const isValid = value.items.every((item) => {
    const hasService = item.service === CUSTOM_SERVICE_VALUE ? item.customName.trim().length > 0 : item.service.length > 0;
    return hasService && Number(item.unitPrice) > 0;
  });

  function setCategory(category: Category) {
    onChange({ ...value, category, items: [{ ...emptyServiceItem }] });
  }

  function addService() {
    onChange({ ...value, items: [...value.items, { ...emptyServiceItem }] });
  }

  function removeService(index: number) {
    onChange({ ...value, items: value.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Service Type</label>
        <div className="grid grid-cols-2 gap-3">
          {(["Repair", "Inspection"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...value, serviceType: t })}
              className={`rounded-xl border py-3 text-sm font-medium ${
                value.serviceType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Category</label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs ${
                value.category === c ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
              }`}
            >
              {CATEGORY_ICONS[c]}
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Services</label>
        <div className="flex flex-col gap-3">
          {value.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Service {i + 1}</span>
                {value.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              <select
                className={inputClassName}
                value={item.service}
                onChange={(e) => onChange({ ...value, items: updateItem(value.items, i, { service: e.target.value }) })}
              >
                <option value="">-- Select Service --</option>
                {SERVICE_CATALOG[value.category].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {item.service === CUSTOM_SERVICE_VALUE && (
                <input
                  className={inputClassName}
                  placeholder="Enter service name..."
                  value={item.customName}
                  onChange={(e) => onChange({ ...value, items: updateItem(value.items, i, { customName: e.target.value }) })}
                />
              )}
              <input
                className={inputClassName}
                placeholder="Description (optional)"
                value={item.description}
                onChange={(e) => onChange({ ...value, items: updateItem(value.items, i, { description: e.target.value }) })}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Qty</label>
                  <input
                    type="number"
                    min="1"
                    className={inputClassName}
                    value={item.qty}
                    onChange={(e) => onChange({ ...value, items: updateItem(value.items, i, { qty: e.target.value }) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Price (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={inputClassName}
                    value={item.unitPrice}
                    onChange={(e) => onChange({ ...value, items: updateItem(value.items, i, { unitPrice: e.target.value }) })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addService}
          className="mt-3 w-full rounded-xl border border-dashed border-blue-300 text-blue-700 text-sm font-medium py-2.5"
        >
          + Add Service
        </button>
      </div>

      <button
        type="button"
        disabled={!isValid}
        onClick={onNext}
        className="mt-2 w-full rounded-xl bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm py-3.5 flex items-center justify-center gap-2"
      >
        Next
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
