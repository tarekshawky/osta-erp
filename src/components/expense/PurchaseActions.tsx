"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { approveCustomerPurchase, deleteCustomerPurchase, rejectCustomerPurchase } from "@/app/admin/expenses/purchases/actions";

// Approve / Reject (Super Admin) and Delete for a customer purchase.
export function PurchaseActions({ id, status, isSuperAdmin }: { id: string; status: string; isSuperAdmin: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        showToast(done);
        if (after) after();
        else router.refresh();
      } else showToast(res.error ?? "Could not complete the action.");
    });

  const btn = "rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60";
  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {isSuperAdmin && status === "Pending" && (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => approveCustomerPurchase(id), "Purchase approved and recorded as an expense.")} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>Approve</button>
            <button type="button" disabled={pending} onClick={() => setRejecting((r) => !r)} className={`${btn} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}>Reject</button>
          </>
        )}
        {(status !== "Approved" || isSuperAdmin) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm(status === "Approved" ? "Delete this approved purchase and its expense? A record of it is kept in the audit log." : "Delete this purchase? A record of it is kept in the audit log.")) {
                run(() => deleteCustomerPurchase(id), "Purchase deleted.", () => router.push("/admin/expenses/purchases"));
              }
            }}
            className={`${btn} border border-slate-200 bg-white text-red-600 hover:bg-red-50`}
          >
            Delete
          </button>
        )}
      </div>
      {rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejecting…" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="button" disabled={pending} onClick={() => run(() => rejectCustomerPurchase(id, reason), "Purchase rejected.", () => { setRejecting(false); router.refresh(); })} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>Confirm reject</button>
        </div>
      )}
    </div>
  );
}
