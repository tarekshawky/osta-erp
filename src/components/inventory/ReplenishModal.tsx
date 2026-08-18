"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { distributeStock } from "@/app/admin/inventory/actions";

export function ReplenishModal({
  employeeId,
  inventoryItemId,
  displayName,
  unit,
  recommendedQuantity,
  warehouses,
}: {
  employeeId: string;
  inventoryItemId: string;
  displayName: string;
  unit: string;
  recommendedQuantity: number;
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(recommendedQuantity));
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setQuantity(String(recommendedQuantity));
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await distributeStock(warehouseId, employeeId, [{ inventoryItemId, quantity: Number(quantity) }]);
      if (res.ok) {
        close();
        router.refresh();
        showToast("Stock replenished.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5"
      >
        Replenish
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Replenish Stock</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">{displayName}</p>

            <label className="mt-3 block text-xs font-medium text-slate-600">From Warehouse</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-slate-600">
              Quantity {unit ? `(${unit})` : ""} — Recommended: {recommendedQuantity.toLocaleString()}
            </label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !quantity || !warehouseId}
                onClick={confirm}
                className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
              >
                {isPending ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
