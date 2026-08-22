import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { MainWarehouseTable } from "@/components/inventory/MainWarehouseTable";
import { AddStockModal } from "@/components/inventory/AddStockModal";
import { SupplierPurchaseModal } from "@/components/inventory/SupplierPurchaseModal";
import { WarehouseTransferModal } from "@/components/inventory/WarehouseTransferModal";
import { getWarehouseStockSummary, getInventoryItemDisplayName, getWarehouses } from "@/lib/inventoryData";
import { parsePage } from "@/lib/pagination";

const MAIN_WAREHOUSE_PAGE_SIZE = 20;

export default async function MainWarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;

  const [[mainWarehouse], branches, activeItems] = await Promise.all([
    getWarehouses("Active", "Main"),
    getWarehouses("Active", "Branch"),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
  ]);

  const summary = mainWarehouse ? await getWarehouseStockSummary(mainWarehouse.id) : [];
  const rows = status === "low" ? summary.filter((r) => r.status === "Low Stock")
    : status === "out" ? summary.filter((r) => r.status === "Out of Stock")
    : summary;

  const totalPages = Math.max(1, Math.ceil(rows.length / MAIN_WAREHOUSE_PAGE_SIZE));
  const page = Math.min(parsePage(pageParam), totalPages);
  const pagedRows = rows.slice((page - 1) * MAIN_WAREHOUSE_PAGE_SIZE, page * MAIN_WAREHOUSE_PAGE_SIZE);

  const itemOptions = activeItems.map((i) => ({ id: i.id, displayName: getInventoryItemDisplayName(i), unit: i.unit }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Main Warehouse" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Main Warehouse</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Where every Purchase / Stock Received event lands. Move stock into a Branch via Warehouse Transfer.
            </p>
          </div>
          {mainWarehouse && (
            <div className="flex items-center gap-2">
              <AddStockModal items={itemOptions} warehouses={[mainWarehouse]} defaultWarehouseId={mainWarehouse.id} />
              <SupplierPurchaseModal items={itemOptions} warehouses={[mainWarehouse]} defaultWarehouseId={mainWarehouse.id} />
              <WarehouseTransferModal mainWarehouseId={mainWarehouse.id} items={itemOptions} branches={branches} />
            </div>
          )}
        </div>

        {!mainWarehouse ? (
          <p className="text-sm text-slate-400">No Main Warehouse found — run the seed script to create it.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              {[
                { key: undefined, label: "All" },
                { key: "low", label: "Low Stock" },
                { key: "out", label: "Out of Stock" },
              ].map((f) => (
                <a
                  key={f.label}
                  href={f.key ? `/admin/inventory/main-warehouse?status=${f.key}` : "/admin/inventory/main-warehouse"}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                    (status ?? "") === (f.key ?? "") ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </a>
              ))}
            </div>

            <MainWarehouseTable
              rows={pagedRows}
              warehouseId={mainWarehouse.id}
              page={page}
              totalPages={totalPages}
              basePath="/admin/inventory/main-warehouse"
              searchParams={{ status }}
            />
          </>
        )}
      </div>
    </div>
  );
}
