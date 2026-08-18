"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { VEHICLE_STATUSES, getVehicleCurrentOdometer } from "@/lib/vehicleData";

export type VehicleFormInput = {
  name: string;
  owner: string;
  plateType: string;
  plateNumber: string;
  licensingAuthority: string;
  trafficCode: string;
  licenseExpiry: string;
  insuranceExpiry: string;
  policyNumber: string;
  insuranceCompany: string;
  insuranceType: string;
  year: string;
  chassisNumber: string;
  initialOdometer: number;
  registrationDocUrl: string | null;
  insuranceDocUrl: string | null;
  status: string;
  notes: string;
};

export type VehicleActionResult = { ok: boolean; id?: string; error?: string };

function validate(input: VehicleFormInput) {
  if (!input.name.trim()) return "Vehicle Name is required.";
  if (!(VEHICLE_STATUSES as readonly string[]).includes(input.status)) return "Invalid status.";
  if (input.initialOdometer < 0) return "Initial Odometer cannot be negative.";
  return null;
}

function parseYear(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1980 && n <= 2100 ? n : null;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildData(input: VehicleFormInput) {
  return {
    name: input.name.trim(),
    owner: input.owner.trim() || null,
    plateType: input.plateType.trim() || null,
    plateNumber: input.plateNumber.trim() || null,
    licensingAuthority: input.licensingAuthority.trim() || null,
    trafficCode: input.trafficCode.trim() || null,
    licenseExpiry: parseDate(input.licenseExpiry),
    insuranceExpiry: parseDate(input.insuranceExpiry),
    policyNumber: input.policyNumber.trim() || null,
    insuranceCompany: input.insuranceCompany.trim() || null,
    insuranceType: input.insuranceType.trim() || null,
    year: parseYear(input.year),
    chassisNumber: input.chassisNumber.trim() || null,
    initialOdometer: input.initialOdometer,
    registrationDocUrl: input.registrationDocUrl || null,
    insuranceDocUrl: input.insuranceDocUrl || null,
    status: input.status,
    notes: input.notes.trim() || null,
  };
}

export async function createVehicle(input: VehicleFormInput): Promise<VehicleActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.vehicle.findUnique({ where: { name: input.name.trim() } });
  if (existing) return { ok: false, error: "A vehicle with this name already exists." };

  const vehicle = await prisma.vehicle.create({
    data: { ...buildData(input), createdById: admin.id },
  });

  revalidatePath("/admin/vehicles");
  return { ok: true, id: vehicle.id };
}

export async function updateVehicle(vehicleId: string, input: VehicleFormInput): Promise<VehicleActionResult> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!existing) return { ok: false, error: "Vehicle not found." };

  const nameOwner = await prisma.vehicle.findUnique({ where: { name: input.name.trim() } });
  if (nameOwner && nameOwner.id !== vehicleId) return { ok: false, error: "A vehicle with this name already exists." };

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: buildData(input),
  });

  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { ok: true, id: vehicleId };
}

// Narrow, single-field correction for the Mileage Report's quick-edit action --
// deliberately not routed through updateVehicle()/VehicleFormInput, which would
// force carrying every other vehicle field just to change one number. Odometer
// is never stored directly (see getVehicleCurrentOdometer): it's always
// max(initialOdometer, MAX(Expense.odometer)), so this only ever raises the
// floor. A value below what's already on record in an Expense row would be
// silently ignored by that max(), so it's rejected here with a clear reason
// instead of failing invisibly.
export async function correctVehicleOdometer(vehicleId: string, odometer: number): Promise<VehicleActionResult> {
  await requireEmployee("ADMIN");
  if (!(odometer >= 0)) return { ok: false, error: "Enter a valid odometer reading." };

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { ok: false, error: "Vehicle not found." };

  const expenseMax = await getVehicleCurrentOdometer(vehicleId, 0);
  if (odometer < expenseMax) {
    return {
      ok: false,
      error: `A recorded expense already shows ${expenseMax.toLocaleString()} KM — the odometer can't be corrected below that.`,
    };
  }

  await prisma.vehicle.update({ where: { id: vehicleId }, data: { initialOdometer: odometer } });

  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/admin/vehicles/expense-report");
  return { ok: true, id: vehicleId };
}
