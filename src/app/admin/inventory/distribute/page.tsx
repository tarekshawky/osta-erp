import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { DistributeStockForm } from "@/components/inventory/DistributeStockForm";
import { getInventoryItemDisplayName, getLocationQuantity, getWarehouses } from "@/lib/inventoryData";

export default async function DistributeStockPage() {
  const [employees, activeItems, warehouses] = await Promise.all([
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    getWarehouses("Active"),
  ]);

  const itemOptions = await Promise.all(
    activeItems.map(async (i) => {
      const quantitiesByWarehouse: Record<string, number> = {};
      await Promise.all(
        warehouses.map(async (w) => {
          quantitiesByWarehouse[w.id] = await getLocationQuantity(prisma, i.id, w.id);
        })
      );
      return {
        id: i.id,
        displayName: getInventoryItemDisplayName(i),
        unit: i.unit,
        quantitiesByWarehouse,
      };
    })
  );

  return (
    <div className="pb-10">
      <AdminTopBar title="Distribute Stock" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Distribute Stock</h2>
          <p className="text-sm text-slate-500 mt-0.5">Transfer specific quantities from a warehouse to an employee.</p>
        </div>

        {employees.length === 0 || itemOptions.length === 0 || warehouses.length === 0 ? (
          <p className="text-sm text-slate-400">
            {employees.length === 0
              ? "No active employees found."
              : warehouses.length === 0
                ? "No active warehouses found."
                : "No active inventory items found."}
          </p>
        ) : (
          <DistributeStockForm employees={employees.map((e) => ({ id: e.id, name: e.name }))} items={itemOptions} warehouses={warehouses} />
        )}
      </div>
    </div>
  );
}
