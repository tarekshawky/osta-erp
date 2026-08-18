"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FINE_TYPES,
  DEDUCTION_METHODS,
  INSTALLMENT_COUNTS,
  CONTRIBUTION_TYPES,
  computeFineSplit,
  buildInstallmentPlan,
} from "@/lib/vehicleData";
import { maskCardNumber } from "@/lib/creditCardData";
import { compressImageFile } from "@/lib/imageCompress";
import { formatAed } from "@/lib/format";
import { EXPENSE_PAYMENT_METHODS } from "@/lib/expenseData";
import { createVehicleFine, type VehicleFineFormInput } from "@/app/admin/vehicles/fines/actions";

const labelClassName = "text-xs font-medium text-slate-600";
const inputClassName = "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400";

export type VehicleOption = { id: string; name: string; currentOdometer: number };
export type EmployeeOption = { id: string; name: string; code: string };
export type ActiveCreditCardOption = { id: string; name: string; cardHolder: string | null; lastFour: string };

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function VehicleFineForm({
  vehicleOptions,
  employeeOptions,
  activeCards,
  initialVehicleId,
}: {
  vehicleOptions: VehicleOption[];
  employeeOptions: EmployeeOption[];
  activeCards: ActiveCreditCardOption[];
  initialVehicleId?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState<VehicleFineFormInput>({
    vehicleId: initialVehicleId ?? "",
    responsibleEmployeeId: "",
    fineType: "",
    fineNumber: "",
    date: new Date().toISOString().slice(0, 10),
    odometer: null,
    amount: 0,
    contributionType: "",
    contributionValue: null,
    deductionMethod: "",
    installmentCount: null,
    startMonth: currentMonthValue(),
    attachmentUrl: null,
    notes: "",
    payment: "Cash",
    creditCardId: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSavingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  const selectedVehicle = vehicleOptions.find((v) => v.id === value.vehicleId);
  const { companyAmount, employeeAmount } = computeFineSplit(
    value.amount || 0,
    value.contributionType || null,
    value.contributionValue
  );

  const installmentPreview =
    employeeAmount > 0 && value.deductionMethod
      ? buildInstallmentPlan(employeeAmount, value.deductionMethod as "One Time" | "Installments", {
          targetMonth: parseMonthInput(value.startMonth),
          startMonth: parseMonthInput(value.startMonth),
          count: (value.installmentCount ?? 2) as 2 | 3 | 4,
        })
      : [];

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setIsAttaching(true);
    try {
      const dataUrl = file.type.startsWith("image/")
        ? await compressImageFile(file)
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Could not read the file."));
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          });
      setValue((v) => ({ ...v, attachmentUrl: dataUrl }));
    } catch {
      setError("Could not process the selected file.");
    } finally {
      setIsAttaching(false);
    }
  }

  function handleSave(overrideMileage = false) {
    if (isSavingRef.current) return;
    if (!value.vehicleId) return setError("Select a vehicle.");
    if (!value.responsibleEmployeeId) return setError("Select the responsible employee.");
    if (!value.fineType) return setError("Select a fine type.");
    if (!value.odometer || value.odometer <= 0) return setError("Enter the odometer reading.");
    if (!value.amount || value.amount <= 0) return setError("Enter a valid fine amount.");
    if (value.payment === "Credit Card" && !value.creditCardId) return setError("Select a credit card.");
    if (employeeAmount > 0) {
      if (!value.deductionMethod) return setError("Select a deduction method.");
      if (value.deductionMethod === "Installments" && !value.installmentCount) {
        return setError("Select the number of installments.");
      }
    }

    isSavingRef.current = true;
    setError(null);
    setConfirmOverride(null);
    startTransition(async () => {
      const res = await createVehicleFine({ ...value, overrideMileage });
      if (res.ok) {
        router.push(value.vehicleId ? `/admin/vehicles/${value.vehicleId}` : "/admin/expenses");
        router.refresh();
      } else if (res.requiresOverride) {
        setConfirmOverride(res.error ?? "Odometer reading is lower than the last recorded value.");
        isSavingRef.current = false;
      } else {
        setError(res.error ?? "Something went wrong.");
        isSavingRef.current = false;
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Select Vehicle</span>
          <select
            className={inputClassName}
            value={value.vehicleId}
            disabled={!!initialVehicleId}
            onChange={(e) => setValue({ ...value, vehicleId: e.target.value })}
          >
            <option value="">Select vehicle...</option>
            {vehicleOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — Current: {v.currentOdometer.toLocaleString()} KM
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Select Employee</span>
          <select
            className={inputClassName}
            value={value.responsibleEmployeeId}
            onChange={(e) => setValue({ ...value, responsibleEmployeeId: e.target.value })}
          >
            <option value="">Select employee...</option>
            {employeeOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Fine Type</span>
          <select
            className={inputClassName}
            value={value.fineType}
            onChange={(e) => setValue({ ...value, fineType: e.target.value })}
          >
            <option value="">Select type...</option>
            {FINE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Fine Number (optional)</span>
          <input
            type="text"
            className={inputClassName}
            value={value.fineNumber}
            onChange={(e) => setValue({ ...value, fineNumber: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Fine Date</span>
          <input
            type="date"
            className={inputClassName}
            value={value.date}
            onChange={(e) => setValue({ ...value, date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>
            Odometer Reading (KM) {selectedVehicle && <span className="text-slate-400 font-normal">— current: {selectedVehicle.currentOdometer.toLocaleString()} KM</span>}
          </span>
          <input
            type="number"
            min="0"
            className={inputClassName}
            value={value.odometer ?? ""}
            onChange={(e) => setValue({ ...value, odometer: e.target.value ? Number(e.target.value) : null })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Fine Amount (AED)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClassName}
            value={value.amount || ""}
            onChange={(e) => setValue({ ...value, amount: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Payment Method</span>
          <select
            className={inputClassName}
            value={value.payment}
            onChange={(e) => {
              const payment = e.target.value;
              setValue({ ...value, payment, creditCardId: payment === "Credit Card" ? value.creditCardId : null });
            }}
          >
            {EXPENSE_PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {value.payment === "Credit Card" && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClassName}>Select Credit Card</span>
            <select
              className={inputClassName}
              value={value.creditCardId ?? ""}
              onChange={(e) => setValue({ ...value, creditCardId: e.target.value || null })}
            >
              <option value="">Select card...</option>
              {activeCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cardHolder || c.name} — {maskCardNumber(c.lastFour)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 p-4">
        <div className={`${labelClassName} mb-2`}>Company Contribution</div>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => setValue({ ...value, contributionType: "", contributionValue: null })}
            className={`text-xs font-medium rounded-lg px-3 py-1.5 border ${!value.contributionType ? "bg-blue-700 text-white border-blue-700" : "border-slate-200 text-slate-600"}`}
          >
            Company Covers Full Fine
          </button>
          {CONTRIBUTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue({ ...value, contributionType: t, contributionValue: value.contributionValue ?? 0 })}
              className={`text-xs font-medium rounded-lg px-3 py-1.5 border ${value.contributionType === t ? "bg-blue-700 text-white border-blue-700" : "border-slate-200 text-slate-600"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {value.contributionType && (
          <label className="flex flex-col gap-1.5 mb-3 max-w-xs">
            <span className={labelClassName}>{value.contributionType === "Percentage" ? "Company %" : "Company Amount (AED)"}</span>
            <input
              type="number"
              min="0"
              step={value.contributionType === "Percentage" ? "1" : "0.01"}
              className={inputClassName}
              value={value.contributionValue ?? ""}
              onChange={(e) => setValue({ ...value, contributionValue: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-400">Company Pays</div>
            <div className="font-semibold text-slate-900">{formatAed(companyAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Employee Responsibility</div>
            <div className="font-semibold text-red-600">{formatAed(employeeAmount)}</div>
          </div>
        </div>
      </div>

      {employeeAmount > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <div className={`${labelClassName} mb-2`}>Deduction Method</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {DEDUCTION_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setValue({ ...value, deductionMethod: m })}
                className={`text-xs font-medium rounded-lg px-3 py-1.5 border ${value.deductionMethod === m ? "bg-blue-700 text-white border-blue-700" : "border-slate-200 text-slate-600"}`}
              >
                {m}
              </button>
            ))}
          </div>
          {value.deductionMethod && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClassName}>{value.deductionMethod === "One Time" ? "Deduct From Salary (Month)" : "Starting Month"}</span>
                <input
                  type="month"
                  className={inputClassName}
                  value={value.startMonth}
                  onChange={(e) => setValue({ ...value, startMonth: e.target.value })}
                />
              </label>
              {value.deductionMethod === "Installments" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelClassName}>Number of Installments</span>
                  <select
                    className={inputClassName}
                    value={value.installmentCount ?? ""}
                    onChange={(e) => setValue({ ...value, installmentCount: e.target.value ? (Number(e.target.value) as 2 | 3 | 4) : null })}
                  >
                    <option value="">Select...</option>
                    {INSTALLMENT_COUNTS.map((c) => (
                      <option key={c} value={c}>
                        {c} Months
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {installmentPreview.length > 0 && (
            <div className="rounded-lg border border-slate-100 divide-y divide-slate-100">
              {installmentPreview.map((row) => (
                <div key={row.installmentNo} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-slate-600">
                    {row.month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                  </span>
                  <span className="font-semibold text-slate-900">{formatAed(row.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClassName}>Attach Fine Document (optional)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isAttaching}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-200 disabled:opacity-60 text-slate-700 text-sm font-medium px-3 py-2"
            >
              {isAttaching ? "Processing..." : value.attachmentUrl ? "Replace File" : "Upload File"}
            </button>
            {value.attachmentUrl && (
              <>
                <span className="text-xs text-green-600">File attached</span>
                <button
                  type="button"
                  onClick={() => setValue({ ...value, attachmentUrl: null })}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClassName}>Notes (optional)</span>
          <textarea
            rows={2}
            className={inputClassName}
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      {confirmOverride && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">⚠️ {confirmOverride}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-1.5"
            >
              Save Anyway
            </button>
            <button
              type="button"
              onClick={() => setConfirmOverride(null)}
              className="text-xs font-medium border border-amber-300 text-amber-700 rounded-lg px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSave(false)}
          className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-3 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isPending ? "Saving..." : "Save Fine"}
        </button>
      </div>
    </div>
  );
}

function parseMonthInput(value: string): Date {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  }
  return new Date(Date.UTC(y, m - 1, 1));
}
