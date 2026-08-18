"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { returnToWarehouse } from "@/app/admin/inventory/actions";

export function ReturnStockModal({
  employeeId,
  inventoryItemId,
  displayName,
  unit,
  currentQty,
}: {
  employeeId: string;
  inventoryItemId: string;
  displayName: string;
  unit: string;
  currentQty: number;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setQuantity("");
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await returnToWarehouse(employeeId, inventoryItemId, Number(quantity));
      if (res.ok) {
        close();
        router.refresh();
        showToast("Stock returned to warehouse.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Return to Warehouse" className="text-slate-400 hover:text-blue-600 p-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 14l-4-4 4-4M5 10h11a4 4 0 010 8h-1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Return to Warehouse</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {displayName} — Current: <span className="font-semibold text-slate-900">{currentQty.toLocaleString()} {unit}</span>
            </p>
            <label className="mt-3 block text-xs font-medium text-slate-600">Quantity</label>
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
                disabled={isPending || !quantity}
                onClick={confirm}
                className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
              >
                {isPending ? "Saving..." : "Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
