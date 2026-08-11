"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { CUSTOMER_STATUSES } from "@/lib/customerData";
import { setCustomerStatus } from "@/app/admin/customers/actions";

export function CustomerStatusControl({ customerId, currentStatus }: { customerId: string; currentStatus: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleChange(status: string) {
    if (status === currentStatus) return;
    if (status === "Inactive" && !confirm("Deactivate this customer? Their history is preserved.")) return;
    startTransition(async () => {
      await setCustomerStatus(customerId, status);
      showToast(`Status changed to ${status}.`);
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Customer Status</span>
      <select
        disabled={isPending}
        defaultValue={currentStatus}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
      >
        {CUSTOMER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
