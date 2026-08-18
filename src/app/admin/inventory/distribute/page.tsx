import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { DistributeStockForm } from "@/components/inventory/DistributeStockForm";
import { getInventoryItemDisplayName, getBulkLocationQuantities, getWarehouses } from "@/lib/inventoryData";

export default async function DistributeStockPage() {
  const [employees, activeItems, warehouses] = await Promise.all([
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    getWarehouses("Active"),
  ]);

  // One bulk query per warehouse (not per item×warehouse) -- see
  // getBulkLocationQuantities; the catalog can hold hundreds of items.
  const itemIds = activeItems.map((i) => i.id);
  const quantitiesByWarehouseId = Object.fromEntries(
    await Promise.all(warehouses.map(async (w) => [w.id, await getBulkLocationQuantities(prisma, itemIds, w.id)] as const))
  ) as Record<string, Record<string, number>>;

  const itemOptions = activeItems.map((i) => {
    const quantitiesByWarehouse: Record<string, number> = {};
    for (const w of warehouses) quantitiesByWarehouse[w.id] = quantitiesByWarehouseId[w.id]?.[i.id] ?? 0;
    return {
      id: i.id,
      displayName: getInventoryItemDisplayName(i),
      unit: i.unit,
      quantitiesByWarehouse,
    };
  });

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
