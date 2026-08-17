"use client";

import { useState, useTransition } from "react";
import { CREDIT_CARD_STATUSES } from "@/lib/creditCardData";
import type { CreditCardFormInput } from "@/app/admin/wallets/credit-cards/actions";

// Card Number is client-state only and never leaves this component as typed -- only
// its last 4 digits (via CreditCardFormInput.lastFour) are ever sent to the server or
// persisted, so the full number is never stored anywhere.
export type CreditCardFormValue = CreditCardFormInput & { cardNumber: string };

export function CreditCardForm({
  initial,
  isEdit,
  onSave,
  onCancel,
}: {
  initial: CreditCardFormValue;
  isEdit: boolean;
  onSave: (value: CreditCardFormInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<CreditCardFormValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    const digits = value.cardNumber.replace(/\D/g, "");
    // Blank on edit means "keep the current card" -- the real number is never
    // fetched back from the server to prefill this field, so an empty input isn't
    // ambiguous with "clear the card number."
    const lastFour = digits ? digits.slice(-4) : isEdit ? initial.lastFour : "";
    startTransition(async () => {
      const res = await onSave({ ...value, lastFour });
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Card Name *</span>
          <input
            type="text"
            placeholder="E.g. AMR MAHMOUD"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">
            Card Number * {isEdit && <span className="text-slate-400 font-normal">— leave blank to keep current</span>}
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="XXXX XXXX XXXX XXXX"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.cardNumber}
            onChange={(e) => setValue({ ...value, cardNumber: e.target.value })}
          />
          <span className="text-xs text-slate-400">Only the last 4 digits are ever saved — never the full number.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Credit Limit (AED) *</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.creditLimit || ""}
            onChange={(e) => setValue({ ...value, creditLimit: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Card Holder</span>
          <input
            type="text"
            placeholder="Full name"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.cardHolder}
            onChange={(e) => setValue({ ...value, cardHolder: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Billing Cycle</span>
          <input
            type="text"
            placeholder="E.g. 1st - 30th"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.billingCycle}
            onChange={(e) => setValue({ ...value, billingCycle: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Payment Due Date (day of month)</span>
          <input
            type="number"
            min="1"
            max="31"
            placeholder="E.g. 15"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.paymentDueDate}
            onChange={(e) => setValue({ ...value, paymentDueDate: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Status</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.status}
            onChange={(e) => setValue({ ...value, status: e.target.value })}
          >
            {CREDIT_CARD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Notes</span>
          <textarea
            rows={2}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-3 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
