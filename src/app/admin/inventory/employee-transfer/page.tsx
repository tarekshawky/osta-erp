import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { EmployeeTransferForm } from "@/components/inventory/EmployeeTransferForm";
import { getEmployeeInventory } from "@/lib/inventoryData";

export default async function EmployeeTransferPage() {
  const employees = await prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } });

  const inventoryByEmployee: Record<string, { itemId: string; displayName: string; unit: string; current: number }[]> = {};
  await Promise.all(
    employees.map(async (e) => {
      const rows = await getEmployeeInventory(e.id);
      inventoryByEmployee[e.id] = rows.filter((r) => r.current > 0).map((r) => ({ itemId: r.itemId, displayName: r.displayName, unit: r.unit, current: r.current }));
    })
  );

  return (
    <div className="pb-10">
      <AdminTopBar title="Employee Transfer" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Employee-to-Employee Transfer</h2>
          <p className="text-sm text-slate-500 mt-0.5">Move stock directly from one employee&apos;s holding to another&apos;s.</p>
        </div>

        {employees.length < 2 ? (
          <p className="text-sm text-slate-400">Need at least 2 active employees to transfer stock between them.</p>
        ) : (
          <EmployeeTransferForm employees={employees.map((e) => ({ id: e.id, name: e.name }))} inventoryByEmployee={inventoryByEmployee} />
        )}
      </div>
    </div>
  );
}
