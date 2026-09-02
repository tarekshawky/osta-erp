"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";
import { submitStockRequest } from "@/app/employee/inventory/request/actions";

const ACCENT = "#1A56DB";

const T = {
  ar: {
    item: "الصنف",
    requestedQuantity: "الكمية المطلوبة",
    reason: "السبب (اختياري)",
    reasonPlaceholder: "مثال: مطلوب لأعمال تصليح مكيفات قادمة",
    submitting: "جارٍ الإرسال...",
    submit: "إرسال الطلب",
    submitted: "تم إرسال طلب المخزون.",
    error: "حدث خطأ ما.",
  },
  en: {
    item: "Item",
    requestedQuantity: "Requested Quantity",
    reason: "Reason (optional)",
    reasonPlaceholder: "e.g. Required for upcoming AC repairs",
    submitting: "Submitting...",
    submit: "Submit Request",
    submitted: "Stock request submitted.",
    error: "Something went wrong.",
  },
} as const;

export function RequestStockForm({
  items,
  lang = "en",
}: {
  items: { id: string; displayName: string; unit: string }[];
  lang?: EmployeeLang;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";
  const selected = items.find((i) => i.id === inventoryItemId);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitStockRequest(inventoryItemId, Number(quantity), reason);
      if (res.ok) {
        setQuantity("");
        setReason("");
        showToast(s.submitted);
        router.refresh();
      } else {
        setError(res.error ?? s.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-1.5">
        <span className={`text-xs font-medium text-slate-600 ${font}`} dir={dir}>
          {s.item}
        </span>
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
        <span className={`text-xs font-medium text-slate-600 ${font}`} dir={dir}>
          {s.requestedQuantity} {selected ? `(${selected.unit})` : ""}
        </span>
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
        <span className={`text-xs font-medium text-slate-600 ${font}`} dir={dir}>
          {s.reason}
        </span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={s.reasonPlaceholder}
          dir={dir}
          className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 ${font}`}
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending || !inventoryItemId || !quantity}
        onClick={submit}
        style={{ background: ACCENT }}
        className={`mt-4 w-full rounded-xl disabled:opacity-60 text-white text-sm font-medium py-3 ${font}`}
        dir={dir}
      >
        {isPending ? s.submitting : s.submit}
      </button>
    </div>
  );
}
