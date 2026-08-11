"use client";

import { useTransition } from "react";
import { useToast } from "@/components/Toast";
import { deleteCustomer } from "@/app/admin/customers/actions";

export function DeleteCustomerButton({
  customerId,
  label = "Delete Customer Permanently",
  pendingLabel = "Deleting...",
  className = "text-sm font-medium text-red-600 hover:text-red-700",
}: {
  customerId: string;
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Permanently delete this customer? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteCustomer(customerId);
      if (res && !res.ok) showToast(res.error ?? "Could not delete customer.");
    });
  }

  return (
    <button type="button" disabled={isPending} onClick={handleClick} className={className}>
      {isPending ? pendingLabel : label}
    </button>
  );
}
