"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { setJobStatus } from "@/app/admin/jobs/actions";

// Shown when enough workers were accepted. It never closes anything by itself; one click does.
export function CloseApplicationsBanner({ jobId, accepted, required }: { jobId: string; accepted: number; required: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
      <span>Required number of workers reached ({accepted} of {required} accepted) — close applications?</span>
      <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await setJobStatus(jobId, "APPLICATIONS_CLOSED", { note: "Required workers reached" }); if (r.ok) { showToast("Applications closed"); router.refresh(); } else showToast(r.error ?? "Could not close applications.", "error"); })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Close applications</button>
    </div>
  );
}
