"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { adjustStock } from "@/app/admin/inventory/actions";

export function AdjustStockModal({
  location,
  inventoryItemId,
  displayName,
  unit,
  currentQty,
}: {
  location: string;
  inventoryItemId: string;
  displayName: string;
  unit: string;
  currentQty: number;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [physicalCount, setPhysicalCount] = useState(String(currentQty));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setPhysicalCount(String(currentQty));
    setReason("");
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await adjustStock(location, inventoryItemId, Number(physicalCount), reason);
      if (res.ok) {
        close();
        router.refresh();
        showToast("Stock adjustment recorded.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  const delta = Number(physicalCount) - currentQty;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Adjust Stock" className="text-slate-400 hover:text-blue-600 p-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 21v-7M4 10V3M12 21v-11M12 6V3M20 21v-5M20 12V3" strokeLinecap="round" />
          <path d="M1 14h6M9 8h6M17 16h6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Adjust Stock</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {displayName} — System: <span className="font-semibold text-slate-900">{currentQty.toLocaleString()} {unit}</span>
            </p>

            <label className="mt-3 block text-xs font-medium text-slate-600">Physical Count</label>
            <input
              type="number"
              min="0"
              value={physicalCount}
              onChange={(e) => setPhysicalCount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {delta !== 0 && (
              <p className="mt-1.5 text-xs text-slate-500">
                Adjustment: <span className={delta > 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>{delta > 0 ? "+" : ""}{delta.toLocaleString()}</span>
              </p>
            )}

            <label className="mt-3 block text-xs font-medium text-slate-600">Adjustment Reason *</label>
            <input
              type="text"
              placeholder="E.g. Physical stock count"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            />

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || physicalCount === "" || !reason.trim() || delta === 0}
                onClick={confirm}
                className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
              >
                {isPending ? "Saving..." : "Save Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
