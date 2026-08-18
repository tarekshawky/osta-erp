"use client";

import { CATEGORIES, CUSTOM_SERVICE_VALUE, type Category } from "@/lib/invoiceData";
import { inputClassName } from "@/components/FormField";
import type { ServiceFormData, ServiceItemFormData, InventoryUsageItemFormData } from "./types";
import { emptyServiceItem, emptyInventoryUsageItem } from "./types";
import { InvoiceItemLine, type SparePartOption, type LabourOption } from "./InvoiceItemLine";

export type InventoryOption = { id: string; displayName: string; unit: string; currentStock: number };

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

function updateUsageLine(lines: InventoryUsageItemFormData[], index: number, patch: Partial<InventoryUsageItemFormData>) {
  return lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
}

export function ServiceStep({
  value,
  onChange,
  onNext,
  inventoryOptions = [],
  employeeOptions = [],
  isAdmin = false,
  stockKnownForEmployeeId,
  sparePartOptions = [],
  labourOptions = [],
  sparePartPriceModification = "Allowed",
  sparePartMaxDiscountPercent = null,
  labourPriceModification = "Allowed",
  labourMaxDiscountPercent = null,
}: {
  value: ServiceFormData;
  onChange: (value: ServiceFormData) => void;
  onNext: () => void;
  inventoryOptions?: InventoryOption[];
  employeeOptions?: { id: string; name: string }[];
  isAdmin?: boolean;
  // inventoryOptions.currentStock was computed server-side for exactly this
  // employee -- switching the "Inventory Used" employee selector away from it
  // makes the hint stale, so it's hidden rather than shown wrong.
  stockKnownForEmployeeId?: string;
  sparePartOptions?: SparePartOption[];
  labourOptions?: LabourOption[];
  sparePartPriceModification?: string;
  sparePartMaxDiscountPercent?: number | null;
  labourPriceModification?: string;
  labourMaxDiscountPercent?: number | null;
}) {
  const isValid =
    value.items.every((item) => {
      if (item.itemType === "SparePart") return !!item.inventoryItemId && Number(item.unitPrice) > 0 && Number(item.qty) > 0;
      if (item.itemType === "Labour") return !!item.labourItemId && Number(item.unitPrice) > 0 && Number(item.qty) > 0;
      const hasService = item.service === CUSTOM_SERVICE_VALUE ? item.customName.trim().length > 0 : item.service.length > 0;
      return hasService && Number(item.unitPrice) > 0;
    }) &&
    value.inventoryUsage.every((line) => !line.inventoryItemId || Number(line.quantity) > 0);

  const inventoryById = new Map(inventoryOptions.map((i) => [i.id, i]));

  function addUsageLine() {
    onChange({ ...value, inventoryUsage: [...value.inventoryUsage, { ...emptyInventoryUsageItem }] });
  }
  function removeUsageLine(index: number) {
    onChange({ ...value, inventoryUsage: value.inventoryUsage.filter((_, i) => i !== index) });
  }

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
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Items</label>
        <div className="flex flex-col gap-3">
          {value.items.map((item, i) => (
            <InvoiceItemLine
              key={i}
              item={item}
              index={i}
              total={value.items.length}
              category={value.category}
              onUpdate={(patch) => onChange({ ...value, items: updateItem(value.items, i, patch) })}
              onRemove={() => removeService(i)}
              sparePartOptions={sparePartOptions}
              labourOptions={labourOptions}
              sparePartPriceModification={sparePartPriceModification}
              sparePartMaxDiscountPercent={sparePartMaxDiscountPercent}
              labourPriceModification={labourPriceModification}
              labourMaxDiscountPercent={labourMaxDiscountPercent}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addService}
          className="mt-3 w-full rounded-xl border border-dashed border-blue-300 text-blue-700 text-sm font-medium py-2.5"
        >
          + Add Item
        </button>
      </div>

      {inventoryOptions.length > 0 && (
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Inventory Used</label>
          <p className="text-xs text-slate-400 mb-2">Deducts stock only — does not affect the invoice amount.</p>

          {isAdmin && employeeOptions.length > 0 && (
            <select
              className={`${inputClassName} mb-3`}
              value={value.inventoryEmployeeId}
              onChange={(e) => onChange({ ...value, inventoryEmployeeId: e.target.value })}
            >
              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex flex-col gap-3">
            {value.inventoryUsage.map((line, i) => {
              const item = inventoryById.get(line.inventoryItemId);
              return (
                <div key={i} className="rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">Item {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeUsageLine(i)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <select
                    className={inputClassName}
                    value={line.inventoryItemId}
                    onChange={(e) => onChange({ ...value, inventoryUsage: updateUsageLine(value.inventoryUsage, i, { inventoryItemId: e.target.value }) })}
                  >
                    <option value="">-- Select Item --</option>
                    {inventoryOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.displayName}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className="text-xs text-slate-500">
                      Quantity Used {item ? `(${item.unit})` : ""}
                      {item && value.inventoryEmployeeId === stockKnownForEmployeeId && (
                        <span className="text-slate-400"> — Available: {item.currentStock.toLocaleString()} {item.unit}</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      className={inputClassName}
                      value={line.quantity}
                      onChange={(e) => onChange({ ...value, inventoryUsage: updateUsageLine(value.inventoryUsage, i, { quantity: e.target.value }) })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addUsageLine}
            className="mt-3 w-full rounded-xl border border-dashed border-slate-300 text-slate-600 text-sm font-medium py-2.5"
          >
            + Add Inventory Item
          </button>
        </div>
      )}

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
