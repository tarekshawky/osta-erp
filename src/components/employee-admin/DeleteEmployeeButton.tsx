"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { deleteEmployee } from "@/app/admin/employees/actions";

export function DeleteEmployeeButton({ employeeId, className }: { employeeId: string; className?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this employee? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteEmployee(employeeId);
      if (!res.ok) {
        alert(res.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
      showToast("Employee deleted.");
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
