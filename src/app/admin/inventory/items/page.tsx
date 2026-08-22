import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InventoryItemsManager } from "@/components/inventory/InventoryItemsManager";
import { getInventoryItemDisplayName, getBulkAllWarehousesQuantities } from "@/lib/inventoryData";

export default async function InventoryItemsPage() {
  const [items, suppliers, categories] = await Promise.all([
    prisma.inventoryItem.findMany({ orderBy: { name: "asc" }, include: { supplier: { select: { name: true } } } }),
    prisma.supplier.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.inventoryCategory.findMany({
      where: { status: "Active" },
      include: { subcategories: { where: { status: "Active" }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);
  // Total across every warehouse (not employee-held) -- see InventoryItemListCard's
  // "Warehouse Stock" label. Bulk-queried (not per-item) since the Spare Parts
  // catalog can hold hundreds of rows -- see getBulkAllWarehousesQuantities.
  const quantities = await getBulkAllWarehousesQuantities(prisma, items.map((i) => i.id));

  const rows = items.map((item) => ({
    id: item.id,
    name: item.name,
    specification: item.specification,
    displayName: getInventoryItemDisplayName(item),
    unit: item.unit,
    category: item.category,
    subcategory: item.subcategory,
    description: item.description,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    minimumMainStock: item.minimumMainStock,
    status: item.status,
    mainQty: quantities[item.id] ?? 0,
    supplierId: item.supplierId,
    supplierName: item.supplier?.name ?? null,
    barcode: item.barcode,
  }));

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
        <InventoryItemsManager
          items={rows}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name, subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })) }))}
        />
      </div>
    </div>
  );
}
