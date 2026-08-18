"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { correctVehicleOdometer } from "@/app/admin/vehicles/actions";

export function OdometerCorrectionModal({
  vehicleId,
  vehicleName,
  currentOdometer,
}: {
  vehicleId: string;
  vehicleName: string;
  currentOdometer: number;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentOdometer));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setValue(String(currentOdometer));
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await correctVehicleOdometer(vehicleId, Number(value));
      if (res.ok) {
        close();
        router.refresh();
        showToast("Odometer updated.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Edit Odometer" className="text-slate-400 hover:text-blue-600 p-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Edit Odometer — {vehicleName}</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Current: <span className="font-semibold text-slate-900">{currentOdometer.toLocaleString()} KM</span>
            </p>

            <label className="mt-3 block text-xs font-medium text-slate-600">Odometer Reading (KM)</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !value}
                onClick={confirm}
                className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
