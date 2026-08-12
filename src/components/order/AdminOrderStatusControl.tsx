"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ADMIN_ORDER_STATUSES, toUaeDateTimeLocalValue } from "@/lib/orderData";
import { setOrderStatus } from "@/app/admin/orders/actions";

export function AdminOrderStatusControl({
  orderId,
  currentStatus,
  currentScheduledAt,
}: {
  orderId: string;
  currentStatus: string;
  currentScheduledAt: Date | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState(
    currentScheduledAt ? toUaeDateTimeLocalValue(currentScheduledAt) : ""
  );
  const [isPending, startTransition] = useTransition();

  const needsConfirm = pendingStatus === "Cancelled" || pendingStatus === "Reschedule";

  function apply(status: string, options?: { reason?: string; newScheduledAt?: string }) {
    startTransition(async () => {
      const res = await setOrderStatus(orderId, status, options);
      if (res.ok) {
        showToast(`Order status changed to ${status}.`);
        setPendingStatus(null);
        setReason("");
        router.refresh();
      } else {
        showToast(res.error ?? "Could not change status.");
      }
    });
  }

  function handleSelect(status: string) {
    if (status === currentStatus) return;
    if (status === "Cancelled" || status === "Reschedule") {
      setPendingStatus(status);
      return;
    }
    apply(status);
  }

  function confirmCancel() {
    apply("Cancelled", { reason });
  }

  function confirmReschedule() {
    if (!newScheduledAt) {
      showToast("Pick a new date and time.");
      return;
    }
    apply("Reschedule", { reason, newScheduledAt });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-500 font-medium">Order Status</span>
        <select
          disabled={isPending}
          value={pendingStatus ?? currentStatus}
          onChange={(e) => handleSelect(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
        >
          {ADMIN_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {pendingStatus === "Cancelled" && (
        <div className="mt-3 flex flex-col gap-2">
          <Field label="Cancellation Reason (Optional)">
            <textarea
              rows={2}
              className={inputClassName}
              placeholder="Why is this order being cancelled?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={confirmCancel}
              className="rounded-lg bg-red-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
            >
              {isPending ? "Cancelling..." : "Confirm Cancellation"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingStatus(null);
                setReason("");
              }}
              className="rounded-lg border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pendingStatus === "Reschedule" && (
        <div className="mt-3 flex flex-col gap-2">
          <Field label="New Date & Time">
            <input
              type="datetime-local"
              className={inputClassName}
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
            />
          </Field>
          <Field label="Reschedule Reason (Optional)">
            <textarea
              rows={2}
              className={inputClassName}
              placeholder="e.g. Customer requested another time."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={confirmReschedule}
              className="rounded-lg bg-indigo-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
            >
              {isPending ? "Saving..." : "Confirm Reschedule"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingStatus(null);
                setReason("");
              }}
              className="rounded-lg border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!needsConfirm && (
        <p className="mt-2 text-xs text-slate-400">
          Overrides the operational status directly. Employees keep using their own workflow buttons.
        </p>
      )}
    </div>
  );
}
