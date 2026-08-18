"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { updateEquityAndSignatory, type EquitySignatoryInput } from "@/app/actions/settings";

export function EquitySignatoryForm({
  shareCapital,
  statutoryReserves,
  signatoryName,
  signatoryDesignation,
  shareholderEmployeeId,
  employees,
}: {
  shareCapital: number | null;
  statutoryReserves: number | null;
  signatoryName: string | null;
  signatoryDesignation: string | null;
  shareholderEmployeeId: string | null;
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EquitySignatoryInput>({
    shareCapital: shareCapital != null ? String(shareCapital) : "",
    statutoryReserves: statutoryReserves != null ? String(statutoryReserves) : "",
    signatoryName: signatoryName ?? "",
    signatoryDesignation: signatoryDesignation ?? "",
    shareholderEmployeeId: shareholderEmployeeId ?? "",
  });

  function set<K extends keyof EquitySignatoryInput>(key: K, value: EquitySignatoryInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateEquityAndSignatory(form);
      if (res.ok) {
        router.refresh();
        showToast("Equity & signatory details saved.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Share Capital (AED)</label>
          <input
            type="number"
            step="0.01"
            value={form.shareCapital}
            onChange={(e) => set("shareCapital", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Statutory Reserves (AED)</label>
          <input
            type="number"
            step="0.01"
            value={form.statutoryReserves}
            onChange={(e) => set("statutoryReserves", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">Shareholder / Owner</label>
        <select
          value={form.shareholderEmployeeId}
          onChange={(e) => set("shareholderEmployeeId", e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">Their wallet position drives the Shareholder&apos;s Current Account line.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Authorized Signatory Name</label>
          <input
            type="text"
            value={form.signatoryName}
            onChange={(e) => set("signatoryName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Designation</label>
          <input
            type="text"
            value={form.signatoryDesignation}
            onChange={(e) => set("signatoryDesignation", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5"
      >
        {isPending ? "Saving..." : "Save Equity & Signatory"}
      </button>
    </div>
  );
}
