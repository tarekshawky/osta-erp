"use client";

import { useRef, useState, useTransition } from "react";
import { VEHICLE_STATUSES } from "@/lib/vehicleData";
import { compressImageFile } from "@/lib/imageCompress";
import type { VehicleFormInput } from "@/app/admin/vehicles/actions";

export type VehicleFormValue = VehicleFormInput;

const labelClassName = "text-xs font-medium text-slate-600";
const inputClassName = "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400";

function DocUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the file."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setIsAttaching(true);
    try {
      const dataUrl = file.type.startsWith("image/") ? await compressImageFile(file) : await readFileAsDataUrl(file);
      onChange(dataUrl);
    } finally {
      setIsAttaching(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClassName}>{label}</span>
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
          {isAttaching ? "Processing..." : value ? "Replace File" : "Upload File"}
        </button>
        {value && (
          <>
            <span className="text-xs text-green-600">File attached</span>
            <button type="button" onClick={() => onChange(null)} className="text-xs text-red-500 hover:text-red-600">
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function VehicleForm({
  initial,
  isEdit,
  onSave,
  onCancel,
}: {
  initial: VehicleFormValue;
  isEdit: boolean;
  onSave: (value: VehicleFormInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<VehicleFormValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await onSave(value);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Vehicle Name *</span>
          <input
            type="text"
            placeholder="E.g. MG ZST"
            className={inputClassName}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Owner</span>
          <input
            type="text"
            className={inputClassName}
            value={value.owner}
            onChange={(e) => setValue({ ...value, owner: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Plate Type</span>
          <input
            type="text"
            className={inputClassName}
            value={value.plateType}
            onChange={(e) => setValue({ ...value, plateType: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Plate Number</span>
          <input
            type="text"
            className={inputClassName}
            value={value.plateNumber}
            onChange={(e) => setValue({ ...value, plateNumber: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Licensing Authority</span>
          <input
            type="text"
            className={inputClassName}
            value={value.licensingAuthority}
            onChange={(e) => setValue({ ...value, licensingAuthority: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Traffic Code</span>
          <input
            type="text"
            className={inputClassName}
            value={value.trafficCode}
            onChange={(e) => setValue({ ...value, trafficCode: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>License Expiry</span>
          <input
            type="date"
            className={inputClassName}
            value={value.licenseExpiry}
            onChange={(e) => setValue({ ...value, licenseExpiry: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Insurance Expiry</span>
          <input
            type="date"
            className={inputClassName}
            value={value.insuranceExpiry}
            onChange={(e) => setValue({ ...value, insuranceExpiry: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Policy Number</span>
          <input
            type="text"
            className={inputClassName}
            value={value.policyNumber}
            onChange={(e) => setValue({ ...value, policyNumber: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Insurance Company</span>
          <input
            type="text"
            className={inputClassName}
            value={value.insuranceCompany}
            onChange={(e) => setValue({ ...value, insuranceCompany: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Insurance Type</span>
          <input
            type="text"
            className={inputClassName}
            value={value.insuranceType}
            onChange={(e) => setValue({ ...value, insuranceType: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Year</span>
          <input
            type="number"
            className={inputClassName}
            value={value.year}
            onChange={(e) => setValue({ ...value, year: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Chassis Number</span>
          <input
            type="text"
            className={inputClassName}
            value={value.chassisNumber}
            onChange={(e) => setValue({ ...value, chassisNumber: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>
            Initial Odometer (KM) {isEdit && <span className="text-slate-400 font-normal">— baseline, not editable history</span>}
          </span>
          <input
            type="number"
            min="0"
            className={inputClassName}
            value={value.initialOdometer || ""}
            onChange={(e) => setValue({ ...value, initialOdometer: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClassName}>Status</span>
          <select
            className={inputClassName}
            value={value.status}
            onChange={(e) => setValue({ ...value, status: e.target.value })}
          >
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <DocUploadField
          label="Registration Document"
          value={value.registrationDocUrl}
          onChange={(dataUrl) => setValue({ ...value, registrationDocUrl: dataUrl })}
        />
        <DocUploadField
          label="Insurance Document"
          value={value.insuranceDocUrl}
          onChange={(dataUrl) => setValue({ ...value, insuranceDocUrl: dataUrl })}
        />
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClassName}>Notes</span>
          <textarea
            rows={2}
            className={inputClassName}
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
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
