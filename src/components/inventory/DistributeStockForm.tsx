"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { distributeStock } from "@/app/admin/inventory/actions";

type ItemOption = { id: string; displayName: string; unit: string; quantitiesByWarehouse: Record<string, number> };
type Line = { inventoryItemId: string; quantity: string };

export function DistributeStockForm({
  employees,
  items,
  warehouses,
}: {
  employees: { id: string; name: string }[];
  items: ItemOption[];
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([{ inventoryItemId: items[0]?.id ?? "", quantity: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const itemById = new Map(items.map((i) => [i.id, i]));
  const availableFor = (itemId: string) => itemById.get(itemId)?.quantitiesByWarehouse[warehouseId] ?? 0;

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { inventoryItemId: items[0]?.id ?? "", quantity: "" }]);
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(overrideLimit = false) {
    setError(null);
    setConfirmOverride(null);
    const parsedLines = lines
      .filter((l) => l.inventoryItemId && l.quantity)
      .map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: Number(l.quantity) }));

    if (parsedLines.length === 0) {
      setError("Add at least one item with a quantity.");
      return;
    }
    if (!overrideLimit) {
      for (const line of parsedLines) {
        const item = itemById.get(line.inventoryItemId);
        const available = availableFor(line.inventoryItemId);
        if (item && line.quantity > available) {
          setError(
            `Insufficient Stock for ${item.displayName} — Available: ${available.toLocaleString()}, Requested: ${line.quantity.toLocaleString()}.`
          );
          return;
        }
      }
    }

    startTransition(async () => {
      const res = await distributeStock(warehouseId, employeeId, parsedLines, overrideLimit);
      if (res.ok) {
        setLines([{ inventoryItemId: items[0]?.id ?? "", quantity: "" }]);
        router.refresh();
        showToast("Stock distributed.");
      } else if (res.requiresOverride) {
        setConfirmOverride(res.error ?? "This exceeds the employee's maximum allowed quantity for this item.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">From Warehouse</span>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Employee</span>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {lines.map((line, index) => {
          const item = itemById.get(line.inventoryItemId);
          return (
            <div key={index} className="flex items-end gap-3">
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-xs font-medium text-slate-600">Item</span>
                <select
                  value={line.inventoryItemId}
                  onChange={(e) => updateLine(index, { inventoryItemId: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.displayName} — {(i.quantitiesByWarehouse[warehouseId] ?? 0).toLocaleString()} {i.unit} available
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 w-32">
                <span className="text-xs font-medium text-slate-600">Quantity {item ? `(${item.unit})` : ""}</span>
                <input
                  type="number"
                  min="0"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </label>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="text-slate-400 hover:text-red-500 p-2.5"
                  title="Remove"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        + Add Item
      </button>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {confirmOverride && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">⚠️ {confirmOverride}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => submit(true)}
              className="text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-1.5"
            >
              Override & Distribute Anyway
            </button>
            <button
              type="button"
              onClick={() => setConfirmOverride(null)}
              className="text-xs font-medium border border-amber-300 text-amber-700 rounded-lg px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-5">
        <button
          type="button"
          disabled={isPending || !employeeId || !warehouseId || items.length === 0}
          onClick={() => submit(false)}
          className="rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isPending ? "Distributing..." : "Confirm Distribution"}
        </button>
      </div>
    </div>
  );
}
