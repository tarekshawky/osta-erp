"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { transferBetweenEmployees } from "@/app/admin/inventory/actions";

type EmployeeItem = { itemId: string; displayName: string; unit: string; current: number };

export function EmployeeTransferForm({
  employees,
  inventoryByEmployee,
}: {
  employees: { id: string; name: string }[];
  inventoryByEmployee: Record<string, EmployeeItem[]>;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [fromEmployeeId, setFromEmployeeId] = useState(employees[0]?.id ?? "");
  const [toEmployeeId, setToEmployeeId] = useState(employees[1]?.id ?? employees[0]?.id ?? "");
  const fromItems = inventoryByEmployee[fromEmployeeId] ?? [];
  const [inventoryItemId, setInventoryItemId] = useState(fromItems[0]?.itemId ?? "");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentFromItems = inventoryByEmployee[fromEmployeeId] ?? [];
  const selectedItem = currentFromItems.find((i) => i.itemId === inventoryItemId);

  function changeFromEmployee(id: string) {
    setFromEmployeeId(id);
    const items = inventoryByEmployee[id] ?? [];
    setInventoryItemId(items[0]?.itemId ?? "");
  }

  function submit(overrideLimit = false) {
    setError(null);
    setConfirmOverride(null);
    startTransition(async () => {
      const res = await transferBetweenEmployees(fromEmployeeId, toEmployeeId, inventoryItemId, Number(quantity), overrideLimit);
      if (res.ok) {
        setQuantity("");
        showToast("Stock transferred between employees.");
        router.refresh();
      } else if (res.requiresOverride) {
        setConfirmOverride(res.error ?? "This exceeds the destination employee's maximum allowed quantity for this item.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">From Employee</span>
          <select
            value={fromEmployeeId}
            onChange={(e) => changeFromEmployee(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">To Employee</span>
          <select
            value={toEmployeeId}
            onChange={(e) => setToEmployeeId(e.target.value)}
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

      {currentFromItems.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">This employee has no stock to transfer.</p>
      ) : (
        <>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Item</span>
            <select
              value={inventoryItemId}
              onChange={(e) => setInventoryItemId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              {currentFromItems.map((i) => (
                <option key={i.itemId} value={i.itemId}>
                  {i.displayName} — {i.current.toLocaleString()} {i.unit} available
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Quantity {selectedItem ? `(${selectedItem.unit})` : ""}</span>
            <input
              type="number"
              min="0"
              max={selectedItem?.current}
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
          </label>
        </>
      )}

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
              Override & Transfer Anyway
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

      <div className="mt-4">
        <button
          type="button"
          disabled={isPending || !fromEmployeeId || !toEmployeeId || fromEmployeeId === toEmployeeId || !inventoryItemId || !quantity}
          onClick={() => submit(false)}
          className="rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5"
        >
          {isPending ? "Transferring..." : "Transfer"}
        </button>
        {fromEmployeeId === toEmployeeId && <p className="mt-2 text-xs text-amber-600">Select two different employees.</p>}
      </div>
    </div>
  );
}
