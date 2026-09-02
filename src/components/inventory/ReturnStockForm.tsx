"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { submitReturnRequest } from "@/app/employee/inventory/return/actions";
import { RETURN_REASONS } from "@/lib/inventoryData";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

const REASON_LABELS: Record<(typeof RETURN_REASONS)[number], { ar: string; en: string }> = {
  "Not Used": { ar: "لم تُستخدم", en: "Not Used" },
  "Wrong Part": { ar: "قطعة خاطئة", en: "Wrong Part" },
  "Extra Stock": { ar: "كمية زائدة", en: "Extra Stock" },
  Other: { ar: "أخرى", en: "Other" },
};

const T = {
  ar: {
    noStock: "لا يوجد لديك مخزون لإرجاعه.",
    item: "الصنف",
    inHand: "بحوزتك",
    quantity: "الكمية",
    reason: "السبب",
    submitting: "جارٍ الإرسال...",
    submit: "إرسال طلب الإرجاع",
    submitted: "تم إرسال طلب الإرجاع.",
    error: "حدث خطأ ما.",
  },
  en: {
    noStock: "You have no stock to return.",
    item: "Item",
    inHand: "in hand",
    quantity: "Quantity",
    reason: "Reason",
    submitting: "Submitting...",
    submit: "Submit Return Request",
    submitted: "Return request submitted.",
    error: "Something went wrong.",
  },
} as const;

export function ReturnStockForm({
  items,
  lang = "en",
}: {
  items: { id: string; displayName: string; unit: string; current: number }[];
  lang?: EmployeeLang;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";
  const selected = items.find((i) => i.id === inventoryItemId);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitReturnRequest(inventoryItemId, Number(quantity), reason);
      if (res.ok) {
        setQuantity("");
        showToast(s.submitted);
        router.refresh();
      } else {
        setError(res.error ?? s.error);
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className={`text-sm text-slate-400 ${font}`} dir={dir}>
        {s.noStock}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex flex-col gap-1.5">
        <span className={`text-xs font-medium text-slate-600 ${font}`} dir={dir}>
          {s.item}
        </span>
        <select
          value={inventoryItemId}
          onChange={(e) => setInventoryItemId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.displayName} — {i.current.toLocaleString()} {i.unit} {s.inHand}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className={`text-xs font-medium text-slate-600 ${font}`} dir={dir}>
          {s.quantity} {selected ? `(${selected.unit})` : ""}
        </span>
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
        <span className={`text-xs font-medium text-slate-600 ${font}`} dir={dir}>
          {s.reason}
        </span>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {REASON_LABELS[r][lang]}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending || !inventoryItemId || !quantity}
        onClick={submit}
        className={`mt-4 w-full rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 ${font}`}
        dir={dir}
      >
        {isPending ? s.submitting : s.submit}
      </button>
    </div>
  );
}
