"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePayrollEntry } from "@/app/admin/payroll/actions";

export function DeletePayrollButton({ entryId, className }: { entryId: string; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this payroll entry? This cannot be undone.")) return;
    startTransition(async () => {
      await deletePayrollEntry(entryId);
      router.refresh();
    });
  }

  return (
    <button type="button" disabled={isPending} onClick={handleClick} className={className} title="Delete">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
