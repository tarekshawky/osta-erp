"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed } from "@/lib/format";
import { RENTAL_PAYMENT_METHODS } from "@/lib/rentalData";
import { recordRentalPayment } from "@/app/admin/rental-expenses/actions";

export function RecordRentalPaymentModal({
  transactionId,
  agreementName,
  amount,
  defaultPaymentMethod,
  trigger,
}: {
  transactionId: string;
  agreementName: string;
  amount: number;
  defaultPaymentMethod: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>(
    (RENTAL_PAYMENT_METHODS as readonly string[]).includes(defaultPaymentMethod) ? defaultPaymentMethod : RENTAL_PAYMENT_METHODS[0]
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReferenceNumber("");
    setNotes("");
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await recordRentalPayment(transactionId, { paymentDate, paymentMethod, referenceNumber, notes });
      if (res.ok) {
        close();
        router.refresh();
        showToast("Payment recorded.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Record Payment — {agreementName}</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Amount: <span className="font-semibold text-slate-900">{formatAed(amount)}</span>
            </p>

            <label className="mt-3 block text-xs font-medium text-slate-600">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RENTAL_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-slate-600">Reference Number (optional)</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                disabled={isPending || !paymentDate}
                onClick={confirm}
                className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isPending ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
