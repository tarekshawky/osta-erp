"use client";

import { useState, useTransition } from "react";
import type { EmployeeFormInput } from "@/app/admin/employees/actions";

export type EmployeeFormValue = EmployeeFormInput;

const TEAM_OPTIONS = ["Ajman", "Al Ain", "Admin"];

export function EmployeeForm({
  initial,
  isEdit,
  onSave,
  onCancel,
}: {
  initial: EmployeeFormValue;
  isEdit: boolean;
  onSave: (value: EmployeeFormValue) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<EmployeeFormValue>(initial);
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
          <span className="text-xs font-medium text-slate-600">Employee Code *</span>
          <input
            type="text"
            placeholder="E.g. EMP-001"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.code}
            onChange={(e) => setValue({ ...value, code: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Full Name *</span>
          <input
            type="text"
            placeholder="Full name"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Job Title</span>
          <input
            type="text"
            placeholder="Technician..."
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.jobTitle}
            onChange={(e) => setValue({ ...value, jobTitle: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Phone</span>
          <input
            type="text"
            placeholder="+971..."
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.phone}
            onChange={(e) => setValue({ ...value, phone: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Team</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.teamName}
            onChange={(e) => setValue({ ...value, teamName: e.target.value })}
          >
            {TEAM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Role</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.role}
            onChange={(e) => setValue({ ...value, role: e.target.value as "employee" | "admin" })}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">
            PIN Code (4 digits) {isEdit && <span className="text-slate-400 font-normal">— leave blank to keep current</span>}
          </span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="****"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.pin}
            onChange={(e) => setValue({ ...value, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Status</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.status}
            onChange={(e) => setValue({ ...value, status: e.target.value as EmployeeFormValue["status"] })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Initial Custody (AED)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.custody || 0}
            onChange={(e) => setValue({ ...value, custody: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Monthly Salary (AED)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.monthlySalary || 0}
            onChange={(e) => setValue({ ...value, monthlySalary: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Wallet</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.hasWallet ? "open" : "none"}
            onChange={(e) => setValue({ ...value, hasWallet: e.target.value === "open" })}
          >
            <option value="open">Open a wallet</option>
            <option value="none">No wallet needed</option>
          </select>
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
