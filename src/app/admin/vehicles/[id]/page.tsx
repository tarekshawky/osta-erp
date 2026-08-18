import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { VehicleProfileTabs } from "@/components/vehicle/VehicleProfileTabs";
import {
  getVehicleCurrentOdometer,
  getNextServiceDue,
  getServiceDueStatus,
  getVehicleExpenseTotals,
  getServiceHistory,
  getFuelHistory,
  getFuelSummary,
  getVehicleOdometerLog,
  getVehicleDocuments,
} from "@/lib/vehicleData";

export default async function VehicleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) notFound();

  const [
    currentOdometer,
    nextService,
    serviceDueStatus,
    expenseTotals,
    expenses,
    serviceHistory,
    fuelHistory,
    fuelSummary,
    mileageLog,
    documents,
    fines,
  ] = await Promise.all([
    getVehicleCurrentOdometer(vehicle.id, vehicle.initialOdometer),
    getNextServiceDue(vehicle.id),
    getServiceDueStatus(vehicle.id, vehicle.initialOdometer),
    getVehicleExpenseTotals(vehicle.id),
    prisma.expense.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { date: "desc" },
      include: { createdBy: true },
    }),
    getServiceHistory(vehicle.id),
    getFuelHistory(vehicle.id),
    getFuelSummary(vehicle.id),
    getVehicleOdometerLog(vehicle.id),
    getVehicleDocuments(vehicle.id),
    prisma.expense.findMany({
      where: { vehicleId: vehicle.id, subcategory: "Fine" },
      orderBy: { date: "desc" },
      include: { responsibleEmployee: true, fineInstallments: true },
    }),
  ]);

  const expenseRows = expenses.map((exp) => ({
    id: exp.id,
    date: exp.date,
    subcategory: exp.subcategory,
    description: exp.description,
    odometer: exp.odometer,
    amount: exp.amount,
    payment: exp.payment,
    status: exp.status,
    createdByName: exp.createdBy.name,
  }));

  const timeline = expenses.slice(0, 20).map((exp) => ({
    id: exp.id,
    date: exp.date,
    subcategory: exp.subcategory,
    description: exp.description,
    odometer: exp.odometer,
    amount: exp.amount,
  }));

  const fineRows = fines.map((f) => ({
    id: f.id,
    date: f.date,
    detailType: f.detailType,
    referenceNumber: f.referenceNumber,
    responsibleEmployeeName: f.responsibleEmployee?.name ?? null,
    odometer: f.odometer,
    amount: f.amount,
    companyAmount: f.companyAmount,
    employeeAmount: f.employeeAmount,
    installmentCount: f.fineInstallments.length,
    totalInstallments: f.fineInstallments[0]?.totalCount ?? 0,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title={vehicle.name} />
      <div className="px-6 py-6">
        <div className="text-sm text-slate-400 mb-1">
          <Link href="/admin/vehicles" className="hover:text-slate-600">
            Vehicles
          </Link>{" "}
          / {vehicle.name}
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{vehicle.name}</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {vehicle.plateNumber ?? "—"} {vehicle.licensingAuthority ? `— ${vehicle.licensingAuthority}` : ""}
        </p>

        <div className="mt-4">
          <VehicleProfileTabs
            currentOdometer={currentOdometer}
            lastServiceOdometer={nextService?.lastServiceOdometer ?? null}
            nextServiceOdometer={nextService?.nextServiceOdometer ?? null}
            serviceDueStatus={serviceDueStatus}
            expenseTotals={expenseTotals}
            timeline={timeline}
            expenses={expenseRows}
            serviceHistory={serviceHistory}
            fuelHistory={fuelHistory}
            fuelSummary={fuelSummary}
            fines={fineRows}
            mileageLog={mileageLog}
            documents={documents}
          />
        </div>
      </div>
    </div>
  );
}
