"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { distributeStock } from "@/app/admin/inventory/actions";

type ItemOption = { id: string; displayName: string; unit: string; mainQty: number };
type Line = { inventoryItemId: string; quantity: string };

export function DistributeStockForm({
  employees,
  items,
}: {
  employees: { id: string; name: string }[];
  items: ItemOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([{ inventoryItemId: items[0]?.id ?? "", quantity: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const itemById = new Map(items.map((i) => [i.id, i]));

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { inventoryItemId: items[0]?.id ?? "", quantity: "" }]);
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    setError(null);
    const parsedLines = lines
      .filter((l) => l.inventoryItemId && l.quantity)
      .map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: Number(l.quantity) }));

    if (parsedLines.length === 0) {
      setError("Add at least one item with a quantity.");
      return;
    }
    for (const line of parsedLines) {
      const item = itemById.get(line.inventoryItemId);
      if (item && line.quantity > item.mainQty) {
        setError(
          `Insufficient Stock for ${item.displayName} — Available: ${item.mainQty.toLocaleString()}, Requested: ${line.quantity.toLocaleString()}.`
        );
        return;
      }
    }

    startTransition(async () => {
      const res = await distributeStock(employeeId, parsedLines);
      if (res.ok) {
        setLines([{ inventoryItemId: items[0]?.id ?? "", quantity: "" }]);
        router.refresh();
        showToast("Stock distributed.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-1.5 max-w-sm">
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
                      {i.displayName} — {i.mainQty.toLocaleString()} {i.unit} available
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

      <div className="mt-5">
        <button
          type="button"
          disabled={isPending || !employeeId || items.length === 0}
          onClick={submit}
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
