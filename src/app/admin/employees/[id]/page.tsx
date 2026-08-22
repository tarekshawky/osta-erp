import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { EmployeeInventoryReportPanel } from "@/components/inventory/EmployeeInventoryReportPanel";
import { getEmployeeInventoryReport, getInventoryTransactions, getWarehouses } from "@/lib/inventoryData";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const [report, movementHistory, warehouses] = await Promise.all([
    getEmployeeInventoryReport(id),
    getInventoryTransactions({ employeeId: id }),
    getWarehouses("Active", "Branch"),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title={employee.name} />
      <div className="px-6 py-6">
        <div className="text-sm text-slate-400 mb-1">
          <Link href="/admin/employees" className="hover:text-slate-600">
            Employees
          </Link>{" "}
          / {employee.name}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{employee.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {employee.code} · {employee.jobTitle} · {employee.role === "ADMIN" ? "Admin" : "Employee"}
          </p>
        </div>

        <div className="mt-6">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <span className="rounded-md px-4 py-1.5 text-sm font-medium bg-blue-700 text-white">Inventory Report</span>
          </div>

          <div className="mt-4">
            <EmployeeInventoryReportPanel employeeId={id} report={report} movementHistory={movementHistory} warehouses={warehouses} />
          </div>
        </div>
      </div>
    </div>
  );
}
