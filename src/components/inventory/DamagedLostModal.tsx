"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { recordDamaged, recordLost } from "@/app/admin/inventory/actions";

export function DamagedLostModal({
  location,
  inventoryItemId,
  displayName,
  unit,
  currentQty,
  employeeId,
}: {
  location: string;
  inventoryItemId: string;
  displayName: string;
  unit: string;
  currentQty: number;
  // Passed only when `location` is an Employee.id (not a Warehouse.id) --
  // lets the server action revalidate that employee's profile page.
  employeeId?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"Damaged" | "Lost">("Damaged");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setKind("Damaged");
    setQuantity("");
    setReason("");
    setNotes("");
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const action = kind === "Damaged" ? recordDamaged : recordLost;
      const res = await action(location, inventoryItemId, Number(quantity), reason, notes, employeeId);
      if (res.ok) {
        close();
        router.refresh();
        showToast(kind === "Damaged" ? "Damaged stock recorded." : "Lost stock recorded.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Record Damaged / Lost" className="text-slate-400 hover:text-red-500 p-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Record Damaged / Lost</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {displayName} — Current: <span className="font-semibold text-slate-900">{currentQty.toLocaleString()} {unit}</span>
            </p>

            <label className="mt-3 block text-xs font-medium text-slate-600">Type</label>
            <div className="mt-1 flex gap-2">
              {(["Damaged", "Lost"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border ${
                    kind === k ? "bg-red-50 border-red-300 text-red-700" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <label className="mt-3 block text-xs font-medium text-slate-600">Quantity</label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            />

            <label className="mt-3 block text-xs font-medium text-slate-600">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            />

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !quantity || !reason.trim()}
                onClick={confirm}
                className="flex-1 rounded-xl bg-red-600 disabled:opacity-60 text-white text-sm font-medium py-2.5"
              >
                {isPending ? "Saving..." : `Record ${kind}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
