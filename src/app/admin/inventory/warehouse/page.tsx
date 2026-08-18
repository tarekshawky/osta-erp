import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { MainWarehouseTable } from "@/components/inventory/MainWarehouseTable";
import { AddStockModal } from "@/components/inventory/AddStockModal";
import { SupplierPurchaseModal } from "@/components/inventory/SupplierPurchaseModal";
import { getMainWarehouseSummary, getInventoryItemDisplayName } from "@/lib/inventoryData";

export default async function MainWarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const [summary, activeItems] = await Promise.all([
    getMainWarehouseSummary(),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
  ]);

  const rows = status === "low" ? summary.filter((r) => r.status === "Low Stock")
    : status === "out" ? summary.filter((r) => r.status === "Out of Stock")
    : summary;

  const itemOptions = activeItems.map((i) => ({ id: i.id, displayName: getInventoryItemDisplayName(i), unit: i.unit }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Main Warehouse" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Main Warehouse</h2>
            <p className="text-sm text-slate-500 mt-0.5">The central inventory controlled by Admin.</p>
          </div>
          <div className="flex items-center gap-2">
            <AddStockModal items={itemOptions} />
            <SupplierPurchaseModal items={itemOptions} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          {[
            { key: undefined, label: "All" },
            { key: "low", label: "Low Stock" },
            { key: "out", label: "Out of Stock" },
          ].map((f) => (
            <a
              key={f.label}
              href={f.key ? `/admin/inventory/warehouse?status=${f.key}` : "/admin/inventory/warehouse"}
              className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                (status ?? "") === (f.key ?? "") ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        <MainWarehouseTable rows={rows} />
      </div>
    </div>
  );
}
