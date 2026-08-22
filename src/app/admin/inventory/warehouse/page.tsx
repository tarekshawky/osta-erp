import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { MainWarehouseTable } from "@/components/inventory/MainWarehouseTable";
import { getWarehouseStockSummary, getWarehouses } from "@/lib/inventoryData";
import { parsePage } from "@/lib/pagination";

const WAREHOUSE_STOCK_PAGE_SIZE = 20;

export default async function BranchWarehousesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; warehouseId?: string; page?: string }>;
}) {
  const { status, warehouseId: warehouseIdParam, page: pageParam } = await searchParams;

  const warehouses = await getWarehouses("Active", "Branch");

  const warehouseId = warehouseIdParam && warehouses.some((w) => w.id === warehouseIdParam) ? warehouseIdParam : warehouses[0]?.id;
  const summary = warehouseId ? await getWarehouseStockSummary(warehouseId) : [];

  const rows = status === "low" ? summary.filter((r) => r.status === "Low Stock")
    : status === "out" ? summary.filter((r) => r.status === "Out of Stock")
    : summary;

  const totalPages = Math.max(1, Math.ceil(rows.length / WAREHOUSE_STOCK_PAGE_SIZE));
  const page = Math.min(parsePage(pageParam), totalPages);
  const pagedRows = rows.slice((page - 1) * WAREHOUSE_STOCK_PAGE_SIZE, page * WAREHOUSE_STOCK_PAGE_SIZE);

  return (
    <div className="pb-10">
      <AdminTopBar title="Branch Warehouses" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Branch Warehouses</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Stock received via Warehouse Transfer from the Main Warehouse — the source Admin distributes to employees from.
            </p>
          </div>
        </div>

        {warehouses.length === 0 ? (
          <p className="text-sm text-slate-400">
            No warehouses found. Add one under{" "}
            <a href="/admin/inventory/warehouses" className="text-blue-600 hover:text-blue-700">
              Warehouses
            </a>
            .
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {warehouses.map((w) => (
                <Link
                  key={w.id}
                  href={`/admin/inventory/warehouse?warehouseId=${w.id}${status ? `&status=${status}` : ""}`}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                    warehouseId === w.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {w.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4">
              {[
                { key: undefined, label: "All" },
                { key: "low", label: "Low Stock" },
                { key: "out", label: "Out of Stock" },
              ].map((f) => (
                <Link
                  key={f.label}
                  href={
                    f.key
                      ? `/admin/inventory/warehouse?warehouseId=${warehouseId}&status=${f.key}`
                      : `/admin/inventory/warehouse?warehouseId=${warehouseId}`
                  }
                  className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                    (status ?? "") === (f.key ?? "") ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>

            <MainWarehouseTable
              rows={pagedRows}
              warehouseId={warehouseId!}
              page={page}
              totalPages={totalPages}
              basePath="/admin/inventory/warehouse"
              searchParams={{ warehouseId, status }}
            />
          </>
        )}
      </div>
    </div>
  );
}
