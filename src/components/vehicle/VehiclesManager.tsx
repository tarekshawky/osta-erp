"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { VehicleForm, type VehicleFormValue } from "./VehicleForm";
import { VehicleListCard, type VehicleRow } from "./VehicleListCard";
import { createVehicle, updateVehicle, type VehicleFormInput } from "@/app/admin/vehicles/actions";
import type { VehicleAlert } from "@/lib/vehicleData";

const emptyFormValue: VehicleFormValue = {
  name: "",
  owner: "",
  plateType: "",
  plateNumber: "",
  licensingAuthority: "",
  trafficCode: "",
  licenseExpiry: "",
  insuranceExpiry: "",
  policyNumber: "",
  insuranceCompany: "",
  insuranceType: "",
  year: "",
  chassisNumber: "",
  initialOdometer: 0,
  registrationDocUrl: null,
  insuranceDocUrl: null,
  status: "Active",
  notes: "",
};

export type VehicleManagerRow = VehicleRow & {
  owner: string | null;
  plateType: string | null;
  licensingAuthority: string | null;
  trafficCode: string | null;
  licenseExpiry: string | null;
  insuranceExpiry: string | null;
  policyNumber: string | null;
  insuranceCompany: string | null;
  insuranceType: string | null;
  year: number | null;
  chassisNumber: string | null;
  initialOdometer: number;
  registrationDocUrl: string | null;
  insuranceDocUrl: string | null;
  notes: string | null;
};

function toFormValue(vehicle: VehicleManagerRow): VehicleFormValue {
  return {
    name: vehicle.name,
    owner: vehicle.owner ?? "",
    plateType: vehicle.plateType ?? "",
    plateNumber: vehicle.plateNumber ?? "",
    licensingAuthority: vehicle.licensingAuthority ?? "",
    trafficCode: vehicle.trafficCode ?? "",
    licenseExpiry: vehicle.licenseExpiry ?? "",
    insuranceExpiry: vehicle.insuranceExpiry ?? "",
    policyNumber: vehicle.policyNumber ?? "",
    insuranceCompany: vehicle.insuranceCompany ?? "",
    insuranceType: vehicle.insuranceType ?? "",
    year: vehicle.year ? String(vehicle.year) : "",
    chassisNumber: vehicle.chassisNumber ?? "",
    initialOdometer: vehicle.initialOdometer,
    registrationDocUrl: vehicle.registrationDocUrl,
    insuranceDocUrl: vehicle.insuranceDocUrl,
    status: vehicle.status,
    notes: vehicle.notes ?? "",
  };
}

const ALERT_ICON: Record<VehicleAlert["kind"], string> = {
  "License Expiring": "🪪",
  "Insurance Expiring": "🛡️",
  "Service Overdue": "🔧",
};

export function VehiclesManager({ vehicles, alerts }: { vehicles: VehicleManagerRow[]; alerts: VehicleAlert[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setMode("add");
  }

  function openEdit(id: string) {
    setEditingId(id);
    setMode("edit");
  }

  function close() {
    setMode("closed");
    setEditingId(null);
  }

  async function handleSave(value: VehicleFormInput) {
    const res = mode === "edit" && editingId ? await updateVehicle(editingId, value) : await createVehicle(value);
    if (res.ok) {
      showToast(mode === "edit" ? "Vehicle updated." : "Vehicle added.");
      close();
      router.refresh();
    }
    return res;
  }

  const editingVehicle = editingId ? vehicles.find((v) => v.id === editingId) : null;

  return (
    <div>
      {alerts.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-800 mb-2">Vehicle Alerts ({alerts.length})</div>
          <div className="flex flex-col gap-1.5">
            {alerts.map((a, i) => (
              <div key={i} className="text-sm text-amber-700 flex items-center gap-2">
                <span>{ALERT_ICON[a.kind]}</span>
                <span className="font-medium">{a.vehicleName}</span>
                <span>— {a.kind}:</span>
                <span>{a.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{vehicles.length} vehicle(s)</p>
        {mode === "closed" && (
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + Add Vehicle
          </button>
        )}
      </div>

      {mode === "add" && <VehicleForm initial={emptyFormValue} isEdit={false} onSave={handleSave} onCancel={close} />}
      {mode === "edit" && editingVehicle && (
        <VehicleForm initial={toFormValue(editingVehicle)} isEdit onSave={handleSave} onCancel={close} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {vehicles.map((vehicle) => (
          <VehicleListCard key={vehicle.id} vehicle={vehicle} onEdit={() => openEdit(vehicle.id)} />
        ))}
        {vehicles.length === 0 && (
          <p className="text-sm text-slate-400 py-10 text-center col-span-2">No vehicles added yet.</p>
        )}
      </div>
    </div>
  );
}
