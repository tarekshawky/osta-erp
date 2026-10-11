"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { saveTax, publishVisitFeePolicy, type VisitFeeInput } from "@/app/admin/pricing/actions";

export function TaxForm({ rate, includeVat }: { rate: string; includeVat: boolean }) {
  const { showToast } = useToast();
  const [r, setR] = useState(rate);
  const [inc, setInc] = useState(includeVat);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5">
      <Field label="VAT rate (%)">
        <input className={inputClassName} inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} />
      </Field>
      <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={inc} onChange={(e) => setInc(e.target.checked)} />
        Prices already include VAT
      </label>
      <p className="mt-1 text-xs text-slate-400">
        Inclusive: VAT is shown but the total never grows. Exclusive: VAT is added on top. A service can override this on the Prices tab.
      </p>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await saveTax(r, inc);
            if (res.ok) showToast("Tax settings saved.");
            else setError(res.error ?? "Could not save.");
          })
        }
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

const REASONS = [
  ["CUSTOMER_REFUSED", "Customer refused the team or the service"],
  ["UNREACHABLE", "Customer unreachable / no answer on arrival"],
  ["CANCELLED_AFTER_DISPATCH", "Customer cancelled after the team was dispatched"],
] as const;

export function VisitFeeForm({ initial, version }: { initial: VisitFeeInput; version: number }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleReason(code: string) {
    setV((s) => ({ ...s, reasons: s.reasons.includes(code) ? s.reasons.filter((x) => x !== code) : [...s.reasons, code] }));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-sm text-slate-500">
        Current version: <b>v{version}</b>. Saving publishes a new version; older versions stay unchanged and orders keep the version their customer accepted. Use <code>{"{amount}"}</code> where the amount should appear.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Visit fee (AED)">
          <input className={inputClassName} inputMode="decimal" value={v.amountAed} onChange={(e) => setV({ ...v, amountAed: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={v.requiresAdminReview} onChange={(e) => setV({ ...v, requiresAdminReview: e.target.checked })} />
          Every charge needs admin review
        </label>
        <Field label="Policy text (English)">
          <textarea className={`${inputClassName} min-h-40`} value={v.textEn} onChange={(e) => setV({ ...v, textEn: e.target.value })} />
        </Field>
        <Field label="نص السياسة (Arabic)" dir="rtl">
          <textarea className={`${inputClassName} min-h-40`} dir="rtl" value={v.textAr} onChange={(e) => setV({ ...v, textAr: e.target.value })} />
        </Field>
        <Field label="Consent checkbox label (English)">
          <textarea className={`${inputClassName} min-h-16`} value={v.consentLabelEn} onChange={(e) => setV({ ...v, consentLabelEn: e.target.value })} />
        </Field>
        <Field label="نص خانة الموافقة (Arabic)" dir="rtl">
          <textarea className={`${inputClassName} min-h-16`} dir="rtl" value={v.consentLabelAr} onChange={(e) => setV({ ...v, consentLabelAr: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-slate-600">Reasons a visit fee may be charged</p>
        {REASONS.map(([code, label]) => (
          <label key={code} className="flex items-center gap-2 py-0.5 text-sm text-slate-700">
            <input type="checkbox" checked={v.reasons.includes(code)} onChange={() => toggleReason(code)} />
            {label}
          </label>
        ))}
        <p className="mt-1 text-xs text-slate-400">The fee never applies when the company cancels or the team does not show up.</p>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await publishVisitFeePolicy(v);
            if (res.ok) showToast("New policy version published.");
            else setError(res.error ?? "Could not publish.");
          })
        }
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish new version"}
      </button>
    </div>
  );
}
