"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { updateCashPosition } from "@/app/actions/cashPosition";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function CashPositionForm({ openingBalance, openingDate }: { openingBalance: number; openingDate: Date | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(String(openingBalance));
  const [date, setDate] = useState(toDateInputValue(openingDate));

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateCashPosition(balance, date);
      if (res.ok) {
        router.refresh();
        showToast("Cash position saved.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Opening Cash Balance (AED)</label>
          <input
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">As Of Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Every subsequent Invoice, Expense, Credit Card Payment, and Payroll entry nets forward from here automatically for the
        Cash &amp; Cash Equivalents line.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5"
      >
        {isPending ? "Saving..." : "Save Cash Position"}
      </button>
    </div>
  );
}
