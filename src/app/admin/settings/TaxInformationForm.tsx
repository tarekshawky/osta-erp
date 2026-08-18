"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { updateTaxInformation, type TaxInformationInput } from "@/app/actions/settings";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function TaxInformationForm({
  taxRegistrationNumber,
  taxRegistrationEffectiveDate,
  taxCertificateIssueDate,
  firstTaxPeriodStart,
  firstTaxPeriodEnd,
  firstTaxReturnFilingDueDate,
}: {
  taxRegistrationNumber: string | null;
  taxRegistrationEffectiveDate: Date | null;
  taxCertificateIssueDate: Date | null;
  firstTaxPeriodStart: Date | null;
  firstTaxPeriodEnd: Date | null;
  firstTaxReturnFilingDueDate: Date | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TaxInformationInput>({
    taxRegistrationNumber: taxRegistrationNumber ?? "",
    taxRegistrationEffectiveDate: toDateInputValue(taxRegistrationEffectiveDate),
    taxCertificateIssueDate: toDateInputValue(taxCertificateIssueDate),
    firstTaxPeriodStart: toDateInputValue(firstTaxPeriodStart),
    firstTaxPeriodEnd: toDateInputValue(firstTaxPeriodEnd),
    firstTaxReturnFilingDueDate: toDateInputValue(firstTaxReturnFilingDueDate),
  });

  function set<K extends keyof TaxInformationInput>(key: K, value: TaxInformationInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateTaxInformation(form);
      if (res.ok) {
        router.refresh();
        showToast("Tax information saved.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500">Tax Registration Number</label>
        <input
          type="text"
          value={form.taxRegistrationNumber}
          onChange={(e) => set("taxRegistrationNumber", e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="105444240300001"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Tax Registration Effective Date</label>
          <input
            type="date"
            value={form.taxRegistrationEffectiveDate}
            onChange={(e) => set("taxRegistrationEffectiveDate", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-slate-400">Drives every dynamic report period — not the issue date below.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Certificate Issue Date</label>
          <input
            type="date"
            value={form.taxCertificateIssueDate}
            onChange={(e) => set("taxCertificateIssueDate", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">First Corporate Tax Period Start</label>
          <input
            type="date"
            value={form.firstTaxPeriodStart}
            onChange={(e) => set("firstTaxPeriodStart", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">First Corporate Tax Period End</label>
          <input
            type="date"
            value={form.firstTaxPeriodEnd}
            onChange={(e) => set("firstTaxPeriodEnd", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">First Tax Return Filing Due Date</label>
        <input
          type="date"
          value={form.firstTaxReturnFilingDueDate}
          onChange={(e) => set("firstTaxReturnFilingDueDate", e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5"
      >
        {isPending ? "Saving..." : "Save Tax Information"}
      </button>
    </div>
  );
}
