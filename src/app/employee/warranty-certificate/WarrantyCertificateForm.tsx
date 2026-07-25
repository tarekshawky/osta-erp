"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClassName } from "@/components/FormField";
import { EMIRATES, WARRANTY_DAYS } from "@/lib/invoiceData";
import {
  createWarrantyCertificate,
  updateWarrantyCertificate,
  type WarrantyCertificateFormInput,
} from "@/app/actions/warranty";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysStr(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function WarrantyCertificateForm({
  detailPathPrefix,
  mode = "create",
  certificateId,
  initial,
}: {
  detailPathPrefix: string;
  mode?: "create" | "edit";
  certificateId?: string;
  initial?: WarrantyCertificateFormInput;
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [emirate, setEmirate] = useState(initial?.emirate ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [serviceProvided, setServiceProvided] = useState(initial?.serviceProvided ?? "");
  const [equipmentLocation, setEquipmentLocation] = useState(initial?.equipmentLocation ?? "");
  const [warrantyFrom, setWarrantyFrom] = useState(initial?.warrantyFrom ?? todayStr());
  const [warrantyTo, setWarrantyTo] = useState(initial?.warrantyTo ?? addDaysStr(todayStr(), WARRANTY_DAYS));
  const [teamSupervisor, setTeamSupervisor] = useState(initial?.teamSupervisor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFromChange(value: string) {
    setWarrantyFrom(value);
    setWarrantyTo(addDaysStr(value, WARRANTY_DAYS));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        customerName,
        emirate,
        phone,
        address,
        serviceProvided,
        equipmentLocation,
        warrantyFrom,
        warrantyTo,
        teamSupervisor,
      };
      const res =
        mode === "edit" && certificateId
          ? await updateWarrantyCertificate(certificateId, payload)
          : await createWarrantyCertificate(payload);
      if (res.ok) {
        const id = mode === "edit" ? certificateId! : (res as { id?: string }).id!;
        router.push(`${detailPathPrefix}/${id}`);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <Field label="Customer Name">
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className={inputClassName}
          placeholder="Full name"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Emirate">
          <select value={emirate} onChange={(e) => setEmirate(e.target.value)} className={inputClassName}>
            <option value="">Select...</option>
            {EMIRATES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phone Number">
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClassName} />
        </Field>
      </div>
      <Field label="Address">
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClassName} />
      </Field>
      <Field label="Service Provided">
        <textarea
          value={serviceProvided}
          onChange={(e) => setServiceProvided(e.target.value)}
          rows={3}
          className={inputClassName}
          placeholder="e.g. AC gas refilling and full service"
        />
      </Field>
      <Field label="Equipment / Location">
        <input
          type="text"
          value={equipmentLocation}
          onChange={(e) => setEquipmentLocation(e.target.value)}
          className={inputClassName}
          placeholder="e.g. Split AC - Living Room"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Warranty From">
          <input
            type="date"
            value={warrantyFrom}
            onChange={(e) => handleFromChange(e.target.value)}
            className={inputClassName}
          />
        </Field>
        <Field label="Warranty To">
          <input
            type="date"
            value={warrantyTo}
            onChange={(e) => setWarrantyTo(e.target.value)}
            className={inputClassName}
          />
        </Field>
      </div>
      <Field label="Team Supervisor (optional)">
        <input
          type="text"
          value={teamSupervisor}
          onChange={(e) => setTeamSupervisor(e.target.value)}
          className={inputClassName}
        />
      </Field>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-3 font-medium text-sm"
      >
        {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Certificate"}
      </button>
    </div>
  );
}
