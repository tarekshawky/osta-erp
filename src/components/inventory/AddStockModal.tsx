"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { addStock } from "@/app/admin/inventory/actions";

export function AddStockModal({ items }: { items: { id: string; displayName: string; unit: string }[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = items.find((i) => i.id === inventoryItemId);

  function close() {
    setOpen(false);
    setQuantity("");
    setNotes("");
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await addStock(inventoryItemId, Number(quantity), notes);
      if (res.ok) {
        close();
        router.refresh();
        showToast("Stock added.");
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
        disabled={items.length === 0}
        className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg px-4 py-2.5"
      >
        + Add Stock
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Stock</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <label className="mt-3 block text-xs font-medium text-slate-600">Item</label>
            <select
              value={inventoryItemId}
              onChange={(e) => setInventoryItemId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.displayName}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-slate-600">
              Quantity {selected ? `(${selected.unit})` : ""}
            </label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            />

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !quantity || !inventoryItemId}
                onClick={confirm}
                className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isPending ? "Saving..." : "Add Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
