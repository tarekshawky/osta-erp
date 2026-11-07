"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { MResult } from "@/app/admin/website/maintenance-actions";

export const label = "text-xs font-medium text-slate-600";
export const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";

export function useRun() {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<MResult>, ok?: string, after?: (r: MResult) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return showToast(r.error ?? "Something went wrong.", "error");
      if (ok) showToast(ok);
      after?.(r);
      router.refresh();
    });
  return { run, pending };
}

