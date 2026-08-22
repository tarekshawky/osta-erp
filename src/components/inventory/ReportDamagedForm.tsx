"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { reportDamagedStock } from "@/app/employee/inventory/damaged/actions";

export function ReportDamagedForm({ items }: { items: { id: string; displayName: string; unit: string; current: number }[] }) {
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
      const res = await reportDamagedStock(inventoryItemId, Number(quantity), reason);
      if (res.ok) {
        setQuantity("");
        setReason("");
        showToast("Damaged item reported.");
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">You have no stock to report as damaged.</p>;
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
              {i.displayName} — {i.current.toLocaleString()} {i.unit} in hand
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Quantity {selected ? `(${selected.unit})` : ""}</span>
        <input
          type="number"
          min="0"
          max={selected?.current}
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Reason</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Dropped during transport"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending || !inventoryItemId || !quantity || !reason.trim()}
        onClick={submit}
        className="mt-4 w-full rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
      >
        {isPending ? "Reporting..." : "Report Damaged"}
      </button>
    </div>
  );
}
