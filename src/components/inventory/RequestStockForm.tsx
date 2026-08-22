"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { submitStockRequest } from "@/app/employee/inventory/request/actions";

export function RequestStockForm({ items }: { items: { id: string; displayName: string; unit: string }[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = items.find((i) => i.id === inventoryItemId);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitStockRequest(inventoryItemId, Number(quantity), reason);
      if (res.ok) {
        setQuantity("");
        setReason("");
        showToast("Stock request submitted.");
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Item</span>
        <select
          value={inventoryItemId}
          onChange={(e) => setInventoryItemId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Requested Quantity {selected ? `(${selected.unit})` : ""}</span>
        <input
          type="number"
          min="0"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Reason (optional)</span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Required for upcoming AC repairs"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending || !inventoryItemId || !quantity}
        onClick={submit}
        className="mt-4 w-full rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
      >
        {isPending ? "Submitting..." : "Submit Request"}
      </button>
    </div>
  );
}
