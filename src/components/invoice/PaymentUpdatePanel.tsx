"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { PAYMENT_METHODS } from "@/lib/invoiceData";
import { recordPayment, setInvoiceStatus } from "@/app/admin/invoices/[id]/actions";

const todayInUae = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());

// Admin: record money received on an invoice (full or part) with the date it arrived, or take a recorded payment back.
// The payment method is chosen here independently of the status: picking a method never marks anything paid.
export function PaymentUpdatePanel({
  invoiceId,
  method,
  amount,
  received,
  remaining,
  invoiceDate,
}: {
  invoiceId: string;
  method: string;
  amount: number;
  received: number;
  remaining: number;
  invoiceDate: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(remaining.toFixed(2));
  const [date, setDate] = useState(todayInUae);
  const [how, setHow] = useState(method);

  const fully = remaining <= 0;
  const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";

  function save() {
    start(async () => {
      const res = await recordPayment(invoiceId, { amount: Number(paid), paymentDate: date, method: how });
      if (res.ok) {
        showToast("Payment recorded.");
        setOpen(false);
        router.refresh();
      } else {
        showToast(res.error ?? "Could not record the payment.");
      }
    });
  }

  function reverse() {
    if (!window.confirm("Mark this invoice Unpaid? The received amount and payment date are cleared (the history keeps a record).")) return;
    start(async () => {
      const res = await setInvoiceStatus(invoiceId, "Unpaid");
      if (res.ok) {
        showToast("Invoice marked Unpaid.");
        router.refresh();
      } else showToast(res.error ?? "Could not change status.");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-500">Payment · الدفع</h3>
        <span className="text-xs text-slate-500">
          Received AED {received.toFixed(2)} of {amount.toFixed(2)}
        </span>
      </div>

      {!open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {!fully && (
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Update Payment Status
            </button>
          )}
          {received > 0 && (
            <button type="button" onClick={reverse} disabled={pending} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50">
              Mark as Unpaid
            </button>
          )}
          {fully && <span className="text-sm text-green-700">Fully paid.</span>}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-500">
            Amount received (AED)
            <input type="number" inputMode="decimal" min="0" step="0.01" max={remaining} value={paid} onChange={(e) => setPaid(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            Payment date
            <input type="date" min={invoiceDate} max={todayInUae()} value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            Payment method
            <select value={how} onChange={(e) => setHow(e.target.value)} className={`${field} mt-1`}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m === "Ziina" ? "Zina" : m}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-3">
            <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {pending ? "Saving…" : "Save payment"}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-slate-400 sm:col-span-3">A part payment keeps the invoice open (PARTIALLY PAID) until the balance is received. The invoice date does not change.</p>
        </div>
      )}
    </div>
  );
}
