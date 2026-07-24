"use client";

import { useState, useTransition } from "react";
import { PAYROLL_TYPES, PAYROLL_TYPE_LABELS } from "@/lib/payrollData";
import type { PayrollFormInput } from "@/app/admin/payroll/actions";

export type PayrollFormValue = PayrollFormInput;

export function PayrollForm({
  employees,
  initial,
  onSave,
  onCancel,
}: {
  employees: { id: string; name: string }[];
  initial: PayrollFormValue;
  onSave: (value: PayrollFormValue) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<PayrollFormValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await onSave(value);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Employee</span>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
            value={value.employeeId}
            onChange={(e) => setValue({ ...value, employeeId: e.target.value })}
          >
            <option value="">Select employee...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Type</span>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
            value={value.type}
            onChange={(e) => setValue({ ...value, type: e.target.value })}
          >
            {PAYROLL_TYPES.map((t) => (
              <option key={t} value={t}>
                {PAYROLL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Amount (AED)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.amount || ""}
            onChange={(e) => setValue({ ...value, amount: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Date</span>
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
            value={value.date}
            onChange={(e) => setValue({ ...value, date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Note (optional)</span>
          <input
            type="text"
            placeholder="Note..."
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.note}
            onChange={(e) => setValue({ ...value, note: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-3 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
