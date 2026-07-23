"use client";

import { EMIRATES } from "@/lib/invoiceData";
import { Field, inputClassName } from "@/components/FormField";
import type { CustomerFormData } from "./types";

export function CustomerStep({
  value,
  onChange,
  onNext,
}: {
  value: CustomerFormData;
  onChange: (value: CustomerFormData) => void;
  onNext: () => void;
}) {
  const isValid =
    value.phone.trim().length >= 7 &&
    (value.type === "INDIVIDUAL" ? value.name.trim().length > 0 : value.companyName.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Customer Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...value, type: "INDIVIDUAL" })}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${
              value.type === "INDIVIDUAL"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
            </svg>
            Individual
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, type: "COMPANY" })}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${
              value.type === "COMPANY"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="3" width="16" height="18" rx="1" />
              <path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2" strokeLinecap="round" />
            </svg>
            Company
          </button>
        </div>
      </div>

      {value.type === "COMPANY" && (
        <>
          <Field label="Company Name">
            <input
              className={inputClassName}
              placeholder="Enter company name"
              value={value.companyName}
              onChange={(e) => onChange({ ...value, companyName: e.target.value })}
            />
          </Field>
          <Field label="TRN (Optional)">
            <input
              className={inputClassName}
              placeholder="Enter TRN number"
              value={value.trn}
              onChange={(e) => onChange({ ...value, trn: e.target.value })}
            />
          </Field>
          <Field label="Contact Name">
            <input
              className={inputClassName}
              placeholder="Enter full name"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </Field>
        </>
      )}

      {value.type === "INDIVIDUAL" && (
        <Field label="Customer Name">
          <input
            className={inputClassName}
            placeholder="Enter full name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </Field>
      )}

      <Field label="Phone Number">
        <div className="flex gap-2">
          <span className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-500">+971</span>
          <input
            className={inputClassName}
            placeholder="5X XXX XXXX"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </div>
      </Field>

      <Field label="Emirate">
        <select
          className={inputClassName}
          value={value.emirate}
          onChange={(e) => onChange({ ...value, emirate: e.target.value })}
        >
          {EMIRATES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Building Name">
        <input
          className={inputClassName}
          placeholder="Enter building name"
          value={value.buildingName}
          onChange={(e) => onChange({ ...value, buildingName: e.target.value })}
        />
      </Field>

      <Field label={value.type === "COMPANY" ? "Flat/Office No" : "Flat/Apartment No"}>
        <input
          className={inputClassName}
          placeholder="Enter number"
          value={value.flatNo}
          onChange={(e) => onChange({ ...value, flatNo: e.target.value })}
        />
      </Field>

      <button
        type="button"
        disabled={!isValid}
        onClick={onNext}
        className="mt-2 w-full rounded-xl bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm py-3.5 flex items-center justify-center gap-2"
      >
        Next
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
