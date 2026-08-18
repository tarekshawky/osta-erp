import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InventoryItemsManager } from "@/components/inventory/InventoryItemsManager";
import { getInventoryItemDisplayName, getLocationQuantity, MAIN_LOCATION } from "@/lib/inventoryData";

export default async function InventoryItemsPage() {
  const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });

  const rows = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      name: item.name,
      specification: item.specification,
      displayName: getInventoryItemDisplayName(item),
      unit: item.unit,
      category: item.category,
      description: item.description,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      minimumMainStock: item.minimumMainStock,
      status: item.status,
      mainQty: await getLocationQuantity(prisma, item.id, MAIN_LOCATION),
    }))
  );

  return (
    <div className="pb-10">
      <AdminTopBar title="Inventory Items" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Inventory Items</h2>
            <p className="text-sm text-slate-500 mt-0.5">Create and manage the items your teams can stock and use.</p>
          </div>
        </div>
        <InventoryItemsManager items={rows} />
      </div>
    </div>
  );
}
