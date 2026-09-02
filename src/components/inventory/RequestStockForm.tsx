"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { tajawal } from "@/lib/fonts";
import { submitStockRequest } from "@/app/employee/inventory/request/actions";

const ACCENT = "#1A56DB";

function BilingualLabel({ ar, en }: { ar: string; en: string }) {
  return (
    <div className="flex flex-row items-baseline justify-end gap-1.5">
      <span className={`${tajawal.className} text-[13px] font-bold text-slate-800`} dir="rtl">
        {ar}
      </span>
      <span className="text-[11px] text-slate-400">{en}</span>
    </div>
  );
}

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
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-1.5">
        <BilingualLabel ar="الصنف" en="Item" />
        <select
          value={inventoryItemId}
          onChange={(e) => setInventoryItemId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <BilingualLabel ar="الكمية المطلوبة" en={`Requested Quantity${selected ? ` (${selected.unit})` : ""}`} />
        <input
          type="number"
          min="0"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <BilingualLabel ar="السبب (اختياري)" en="Reason (optional)" />
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Required for upcoming AC repairs"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending || !inventoryItemId || !quantity}
        onClick={submit}
        style={{ background: ACCENT }}
        className="mt-4 w-full rounded-xl disabled:opacity-60 text-white text-sm font-medium py-3 flex flex-col items-center leading-tight"
      >
        <span className={tajawal.className} dir="rtl">
          {isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </span>
        <span className="text-[10px] text-white/75">{isPending ? "Submitting..." : "Submit Request"}</span>
      </button>
    </div>
  );
}
