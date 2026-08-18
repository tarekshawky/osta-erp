"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed, formatDate } from "@/lib/format";
import { RENTAL_AGREEMENT_STATUS_STYLES, type RentalAgreementRow } from "@/lib/rentalData";
import { pauseRentalAgreement, cancelRentalAgreement } from "@/app/admin/rental-expenses/actions";

export function RentalAgreementsList({
  agreements,
  onEdit,
  onRenew,
  onViewTransactions,
  filteredAgreementId,
}: {
  agreements: RentalAgreementRow[];
  onEdit: (id: string) => void;
  onRenew: (id: string) => void;
  onViewTransactions: (id: string | null) => void;
  filteredAgreementId: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handlePause(id: string) {
    setPendingId(id);
    const res = await pauseRentalAgreement(id);
    setPendingId(null);
    if (res.ok) {
      showToast("Agreement paused.");
      router.refresh();
    }
  }

  async function handleCancel(id: string) {
    setPendingId(id);
    const res = await cancelRentalAgreement(id);
    setPendingId(null);
    if (res.ok) {
      showToast("Agreement cancelled.");
      router.refresh();
    }
  }

  if (agreements.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center rounded-xl border border-slate-200 bg-white">No rental agreements yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {agreements.map((a) => (
        <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-slate-900">{a.agreementName}</div>
              <div className="text-sm text-slate-500 mt-0.5">{a.rentalType}</div>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RENTAL_AGREEMENT_STATUS_STYLES[a.status] ?? "bg-slate-100 text-slate-600"}`}>
              {a.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">Monthly Rent</div>
              <div className="font-semibold text-slate-900">{formatAed(a.monthlyRent)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Frequency</div>
              <div className="font-semibold text-slate-900">{a.paymentFrequency}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Start Date</div>
              <div className="font-semibold text-slate-900">{formatDate(a.startDate)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Next Due</div>
              <div className="font-semibold text-slate-900">{a.nextDueDate ? formatDate(a.nextDueDate) : "—"}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => onEdit(a.id)} className="text-blue-600 hover:text-blue-700 font-medium">
              Edit
            </button>
            <button
              type="button"
              onClick={() => onViewTransactions(filteredAgreementId === a.id ? null : a.id)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {filteredAgreementId === a.id ? "Show All Transactions" : "View Transactions"}
            </button>
            {a.status === "Active" && (
              <button
                type="button"
                disabled={pendingId === a.id}
                onClick={() => handlePause(a.id)}
                className="text-amber-600 hover:text-amber-700 font-medium disabled:opacity-60"
              >
                Pause
              </button>
            )}
            {(a.status === "Active" || a.status === "Suspended") && (
              <button
                type="button"
                disabled={pendingId === a.id}
                onClick={() => handleCancel(a.id)}
                className="text-red-600 hover:text-red-700 font-medium disabled:opacity-60"
              >
                Cancel
              </button>
            )}
            {(a.status === "Expired" || a.status === "Cancelled") && (
              <button type="button" onClick={() => onRenew(a.id)} className="text-green-600 hover:text-green-700 font-medium">
                Renew
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
