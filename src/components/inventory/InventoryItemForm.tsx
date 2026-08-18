"use client";

import { useState, useTransition } from "react";
import { INVENTORY_UNITS, INVENTORY_CATEGORIES, INVENTORY_ITEM_STATUSES } from "@/lib/inventoryData";
import type { InventoryItemFormInput } from "@/app/admin/inventory/actions";

export type InventoryItemFormValue = InventoryItemFormInput;

export function InventoryItemForm({
  initial,
  onSave,
  onCancel,
  suppliers,
}: {
  initial: InventoryItemFormValue;
  onSave: (value: InventoryItemFormValue) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  suppliers: { id: string; name: string }[];
}) {
  const [value, setValue] = useState<InventoryItemFormValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await onSave(value);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Item Name *</span>
          <input
            type="text"
            placeholder="E.g. AC Filter"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Specification</span>
          <input
            type="text"
            placeholder="Size / Capacity / Power / Type / Other"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.specification}
            onChange={(e) => setValue({ ...value, specification: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Unit *</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.unit}
            onChange={(e) => setValue({ ...value, unit: e.target.value })}
          >
            {INVENTORY_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Category</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.category}
            onChange={(e) => setValue({ ...value, category: e.target.value })}
          >
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Cost Price (AED)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.costPrice}
            onChange={(e) => setValue({ ...value, costPrice: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Selling Price (AED)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.sellingPrice}
            onChange={(e) => setValue({ ...value, sellingPrice: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Minimum Main Stock</span>
          <input
            type="number"
            min="0"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.minimumMainStock || ""}
            onChange={(e) => setValue({ ...value, minimumMainStock: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Status</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.status}
            onChange={(e) => setValue({ ...value, status: e.target.value })}
          >
            {INVENTORY_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Supplier</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.supplierId}
            onChange={(e) => setValue({ ...value, supplierId: e.target.value })}
          >
            <option value="">— None —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Description</span>
          <textarea
            rows={2}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.description}
            onChange={(e) => setValue({ ...value, description: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-3 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
