import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { VehiclesManager, type VehicleManagerRow } from "@/components/vehicle/VehiclesManager";
import {
  getVehicleCurrentOdometer,
  getNextServiceDue,
  getServiceDueStatus,
  getVehicleExpenseTotals,
  getVehicleAlerts,
} from "@/lib/vehicleData";

export default async function AdminVehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: "asc" } });

  const [rows, alerts] = await Promise.all([
    Promise.all(
      vehicles.map(async (v) => {
        const [currentOdometer, nextService, serviceDueStatus, totals] = await Promise.all([
          getVehicleCurrentOdometer(v.id, v.initialOdometer),
          getNextServiceDue(v.id),
          getServiceDueStatus(v.id, v.initialOdometer),
          getVehicleExpenseTotals(v.id),
        ]);
        return {
          id: v.id,
          name: v.name,
          owner: v.owner,
          plateType: v.plateType,
          plateNumber: v.plateNumber,
          licensingAuthority: v.licensingAuthority,
          trafficCode: v.trafficCode,
          licenseExpiry: v.licenseExpiry ? v.licenseExpiry.toISOString().slice(0, 10) : null,
          insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.toISOString().slice(0, 10) : null,
          policyNumber: v.policyNumber,
          insuranceCompany: v.insuranceCompany,
          insuranceType: v.insuranceType,
          year: v.year,
          chassisNumber: v.chassisNumber,
          initialOdometer: v.initialOdometer,
          registrationDocUrl: v.registrationDocUrl,
          insuranceDocUrl: v.insuranceDocUrl,
          status: v.status,
          notes: v.notes,
          currentOdometer,
          nextServiceOdometer: nextService?.nextServiceOdometer ?? null,
          serviceDueStatus,
          totalExpenses: totals.grandTotal,
        } satisfies VehicleManagerRow;
      })
    ),
    getVehicleAlerts(),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title="Vehicles" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Vehicles</h2>
        <p className="text-sm text-slate-500 mt-0.5">Track fleet expenses, mileage, service, fuel, and fines</p>
        <div className="mt-4">
          <VehiclesManager vehicles={rows} alerts={alerts} />
        </div>
      </div>
    </div>
  );
}
