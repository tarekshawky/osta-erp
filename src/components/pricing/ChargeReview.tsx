"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { reviewVisitFeeCharge } from "@/app/admin/pricing/actions";

export type ChargeRow = { id: string; orderNumber: string; reason: string; evidence: string; amountAed: string; createdAt: string };

export function ChargeReview({ charges }: { charges: ChargeRow[] }) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function decide(id: string, decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const res = await reviewVisitFeeCharge(id, decision, notes[id] ?? "");
      showToast(res.ok ? `Charge ${decision.toLowerCase()}.` : res.error ?? "Failed.", res.ok ? "success" : "error");
    });
  }

  if (charges.length === 0) return <p className="osta-empty rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No visit-fee charges waiting for review.</p>;
  return (
    <div className="flex flex-col gap-3">
      {charges.map((c) => (
        <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-900">{c.orderNumber}</span>
            <span className="text-slate-500">{c.amountAed} AED · {c.createdAt}</span>
          </div>
          <p className="mt-1 text-slate-600">Reason: {c.reason}</p>
          {c.evidence && <p className="mt-1 whitespace-pre-line text-slate-500">Evidence: {c.evidence}</p>}
          <input className={`${inputClassName} mt-3`} placeholder="Review note (required to reject)" value={notes[c.id] ?? ""} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} />
          <div className="mt-3 flex gap-3">
            <button type="button" disabled={pending} onClick={() => decide(c.id, "APPROVED")} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button>
            <button type="button" disabled={pending} onClick={() => decide(c.id, "REJECTED")} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
