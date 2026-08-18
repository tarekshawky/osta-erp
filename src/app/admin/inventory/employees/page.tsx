import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { EmployeeInventoryTable } from "@/components/inventory/EmployeeInventoryTable";
import { getEmployeeInventory, getWarehouses } from "@/lib/inventoryData";

export default async function EmployeeInventoryPage() {
  const [employees, warehouses] = await Promise.all([
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    getWarehouses("Active"),
  ]);

  const rowsByEmployee = await Promise.all(employees.map((e) => getEmployeeInventory(e.id)));

  const employeesWithItems = employees
    .map((e, i) => ({ employee: e, rows: rowsByEmployee[i] }))
    .filter((e) => e.rows.length > 0);

  return (
    <div className="pb-10">
      <AdminTopBar title="Employee Inventory" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Employee Inventory</h2>
          <p className="text-sm text-slate-500 mt-0.5">See exactly what every employee currently has.</p>
        </div>

        {employeesWithItems.length === 0 ? (
          <p className="text-sm text-slate-400">No employee has been distributed any stock yet.</p>
        ) : (
          <div className="space-y-6">
            {employeesWithItems.map(({ employee, rows }) => (
              <div key={employee.id}>
                <h3 className="font-semibold text-slate-900 mb-2">{employee.name}</h3>
                <EmployeeInventoryTable employeeId={employee.id} rows={rows} warehouses={warehouses} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
