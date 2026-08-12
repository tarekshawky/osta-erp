"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { ADMIN_INVOICE_STATUSES } from "@/lib/invoiceData";
import { setInvoiceStatus } from "@/app/admin/invoices/[id]/actions";

export function InvoiceStatusControl({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleChange(status: string) {
    if (status === currentStatus) return;
    startTransition(async () => {
      const res = await setInvoiceStatus(invoiceId, status as "Paid" | "Unpaid");
      if (res.ok) {
        showToast(`Invoice marked ${status}.`);
        router.refresh();
      } else {
        showToast(res.error ?? "Could not change status.");
      }
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Invoice Status</span>
      <select
        disabled={isPending}
        defaultValue={currentStatus}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
      >
        {ADMIN_INVOICE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
