"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { editRentalTransaction } from "@/app/admin/rental-expenses/actions";

export function EditRentalTransactionModal({
  transactionId,
  agreementName,
  amount,
  dueDate,
  referenceNumber,
  notes,
  trigger,
}: {
  transactionId: string;
  agreementName: string;
  amount: number;
  dueDate: Date;
  referenceNumber: string | null;
  notes: string | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [amountValue, setAmountValue] = useState(String(amount));
  const [dueDateValue, setDueDateValue] = useState(dueDate.toISOString().slice(0, 10));
  const [referenceNumberValue, setReferenceNumberValue] = useState(referenceNumber ?? "");
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await editRentalTransaction(transactionId, {
        amount: Number(amountValue),
        dueDate: dueDateValue,
        referenceNumber: referenceNumberValue,
        notes: notesValue,
      });
      if (res.ok) {
        close();
        router.refresh();
        showToast("Transaction updated.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Edit" className="text-slate-400 hover:text-blue-600 p-1">
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Edit Transaction — {agreementName}</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <label className="mt-3 block text-xs font-medium text-slate-600">Amount (AED)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amountValue}
              onChange={(e) => setAmountValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Due Date</label>
            <input
              type="date"
              value={dueDateValue}
              onChange={(e) => setDueDateValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Reference Number (optional)</label>
            <input
              type="text"
              value={referenceNumberValue}
              onChange={(e) => setReferenceNumberValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Notes (optional)</label>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                disabled={isPending || !amountValue || !dueDateValue}
                onClick={confirm}
                className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
