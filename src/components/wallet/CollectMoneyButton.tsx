"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { collectWallet } from "@/app/admin/wallets/actions";

export function CollectMoneyButton({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Collect money for ${employeeName}? This resets their Current Balance to AED 0.00 by adjusting Custody. Nothing is transferred anywhere else.`)) {
      return;
    }
    startTransition(async () => {
      const res = await collectWallet(employeeId);
      if (res.ok) {
        router.refresh();
        showToast("Balance collected.");
      } else {
        showToast(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="flex flex-col items-center gap-1 py-3 text-teal-600 hover:bg-slate-50 w-full disabled:opacity-60"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Collect Money
    </button>
  );
}
