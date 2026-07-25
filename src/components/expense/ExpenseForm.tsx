"use client";

import { useState, useTransition } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  VEHICLES,
  VEHICLE_EXPENSE_TYPES,
  ADVERTISING_PLATFORMS,
} from "@/lib/expenseData";
import type { ExpenseFormInput } from "@/app/admin/expenses/actions";

export type ExpenseFormValue = ExpenseFormInput;

export function ExpenseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ExpenseFormValue;
  onSave: (value: ExpenseFormValue) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<ExpenseFormValue>(initial);
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
          <span className="text-xs font-medium text-slate-600">Category</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.category}
            onChange={(e) => setValue({ ...value, category: e.target.value, vehicle: "", subcategory: "" })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {value.category === "Vehicle" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Vehicle</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                value={value.vehicle}
                onChange={(e) => setValue({ ...value, vehicle: e.target.value })}
              >
                <option value="">Select vehicle...</option>
                {VEHICLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Expense Type</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                value={value.subcategory}
                onChange={(e) => setValue({ ...value, subcategory: e.target.value })}
              >
                <option value="">Select type...</option>
                {VEHICLE_EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {value.category === "Advertising" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Platform</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              value={value.subcategory}
              onChange={(e) => setValue({ ...value, subcategory: e.target.value })}
            >
              <option value="">Select platform...</option>
              {ADVERTISING_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Payment Method</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.payment}
            onChange={(e) => setValue({ ...value, payment: e.target.value })}
          >
            {EXPENSE_PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.amount || ""}
            onChange={(e) => setValue({ ...value, amount: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Date</span>
          <input
            type="date"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.date}
            onChange={(e) => setValue({ ...value, date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Description / Notes</span>
          <input
            type="text"
            placeholder="Description..."
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.description}
            onChange={(e) => setValue({ ...value, description: e.target.value })}
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
