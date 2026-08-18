import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { VehicleFineForm } from "@/components/vehicle/VehicleFineForm";
import { getVehicleCurrentOdometer } from "@/lib/vehicleData";

export default async function NewVehicleFinePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const { vehicleId } = await searchParams;

  const [vehicles, employees, activeCards] = await Promise.all([
    prisma.vehicle.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({
      where: { status: "Active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, cardHolder: true, lastFour: true },
    }),
  ]);

  const vehicleOptions = await Promise.all(
    vehicles.map(async (v) => ({
      id: v.id,
      name: v.name,
      currentOdometer: await getVehicleCurrentOdometer(v.id, v.initialOdometer),
    }))
  );

  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name, code: e.code }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Record Vehicle Fine" />
      <div className="px-6 py-6 max-w-3xl">
        <h2 className="text-2xl font-bold text-slate-900">Record Vehicle Fine</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Records the full fine as an expense and, if the employee is responsible for part of it, creates the Payroll
          deduction automatically.
        </p>
        <div className="mt-4">
          <VehicleFineForm
            vehicleOptions={vehicleOptions}
            employeeOptions={employeeOptions}
            activeCards={activeCards}
            initialVehicleId={vehicleId}
          />
        </div>
      </div>
    </div>
  );
}
