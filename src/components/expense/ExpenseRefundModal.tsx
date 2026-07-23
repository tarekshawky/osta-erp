"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatAed } from "@/lib/format";
import { refundExpense } from "@/app/admin/expenses/actions";

export function ExpenseRefundModal({
  expenseId,
  amount,
  refundedAmount,
  disabled,
  className,
}: {
  expenseId: string;
  amount: number;
  refundedAmount: number;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "partial">("choose");
  const [partialAmount, setPartialAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = amount - refundedAmount;

  function close() {
    setOpen(false);
    setMode("choose");
    setPartialAmount("");
    setError(null);
  }

  function submit(refundAmount: number) {
    setError(null);
    startTransition(async () => {
      const res = await refundExpense(expenseId, refundAmount);
      if (res.ok) {
        close();
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={className} title="Refund">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1015-6.7M3 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Refund Expense</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {mode === "choose" ? (
              <>
                <p className="mt-3 text-sm text-slate-500">
                  Original Amount: <span className="font-semibold text-slate-900">{formatAed(amount)}</span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => submit(remaining)}
                    className="rounded-xl border border-slate-200 p-3 text-left hover:border-red-300"
                  >
                    <div className="font-semibold text-sm text-slate-900">Full Refund</div>
                    <div className="text-xs text-slate-500 mt-0.5">Refund entire amount</div>
                    <div className="text-sm font-bold text-red-600 mt-1">{formatAed(remaining)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("partial")}
                    className="rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300"
                  >
                    <div className="font-semibold text-sm text-slate-900">Partial Refund</div>
                    <div className="text-xs text-slate-500 mt-0.5">Refund a specific amount</div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm">
                  <span className="rounded-full bg-orange-50 text-orange-600 px-2 py-0.5 text-xs font-medium">
                    Partial Refund
                  </span>{" "}
                  <span className="text-slate-500">of {formatAed(remaining)}</span>
                </p>
                <label className="mt-3 block text-xs font-medium text-slate-600">Refund Amount (AED)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={remaining}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("choose")}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isPending || !partialAmount}
                    onClick={() => submit(Number(partialAmount))}
                    className="flex-1 rounded-xl bg-red-400 disabled:opacity-60 text-white text-sm font-medium py-2.5"
                  >
                    Confirm Refund of {formatAed(Number(partialAmount) || 0)}
                  </button>
                </div>
              </>
            )}

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
