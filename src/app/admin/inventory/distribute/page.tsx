import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { DistributeStockForm } from "@/components/inventory/DistributeStockForm";
import { getInventoryItemDisplayName, getLocationQuantity, MAIN_LOCATION } from "@/lib/inventoryData";

export default async function DistributeStockPage() {
  const [employees, activeItems] = await Promise.all([
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
  ]);

  const itemOptions = await Promise.all(
    activeItems.map(async (i) => ({
      id: i.id,
      displayName: getInventoryItemDisplayName(i),
      unit: i.unit,
      mainQty: await getLocationQuantity(prisma, i.id, MAIN_LOCATION),
    }))
  );

  return (
    <div className="pb-10">
      <AdminTopBar title="Distribute Stock" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Distribute Stock</h2>
          <p className="text-sm text-slate-500 mt-0.5">Transfer specific quantities from the Main Warehouse to an employee.</p>
        </div>

        {employees.length === 0 || itemOptions.length === 0 ? (
          <p className="text-sm text-slate-400">
            {employees.length === 0 ? "No active employees found." : "No active inventory items found."}
          </p>
        ) : (
          <DistributeStockForm employees={employees.map((e) => ({ id: e.id, name: e.name }))} items={itemOptions} />
        )}
      </div>
    </div>
  );
}
