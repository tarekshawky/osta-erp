"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { setCustomerStatus } from "@/app/admin/customers/actions";
import { DeleteCustomerButton } from "./DeleteCustomerButton";

export function CustomerRowActions({ customerId, status }: { customerId: string; status: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function toggleBlock() {
    const next = status === "Blocked" ? "Active" : "Blocked";
    startTransition(async () => {
      await setCustomerStatus(customerId, next);
      showToast(next === "Blocked" ? "Customer blocked." : "Customer unblocked.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
      <Link href={`/admin/customers/${customerId}/edit`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
        Edit
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={toggleBlock}
        className="text-sm font-medium text-orange-600 hover:text-orange-700"
      >
        {status === "Blocked" ? "Unblock" : "Block"}
      </button>
      <DeleteCustomerButton customerId={customerId} label="Delete" pendingLabel="Deleting..." className="text-sm font-medium text-red-600 hover:text-red-700" />
    </div>
  );
}
