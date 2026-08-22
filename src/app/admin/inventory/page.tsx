import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { formatAed } from "@/lib/format";
import { computeInventoryDashboardSummary, getMostUsedItems } from "@/lib/inventoryData";

export default async function InventoryDashboardPage() {
  const [summary, mostUsedItems] = await Promise.all([
    computeInventoryDashboardSummary(),
    getMostUsedItems(),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title="Inventory Dashboard" />
      <div className="px-6 py-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">A complete, always up-to-date picture of every stock item.</p>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Total Inventory Items" value={String(summary.totalItems)} />
          <AdminStatCard label="Total Stock" value={summary.totalStock.toLocaleString()} />
          <AdminStatCard label="Total Warehouse Stock" value={summary.warehouseStock.toLocaleString()} />
          <AdminStatCard label="Employee Stock" value={summary.employeeStock.toLocaleString()} />
          <AdminStatCard label="Low Stock" value={String(summary.lowStock)} valueClassName={summary.lowStock > 0 ? "text-amber-600" : "text-slate-900"} />
          <AdminStatCard label="Out of Stock" value={String(summary.outOfStock)} valueClassName={summary.outOfStock > 0 ? "text-red-500" : "text-slate-900"} />
          <AdminStatCard label="Employees With Shortages" value={String(summary.employeesWithShortages)} valueClassName={summary.employeesWithShortages > 0 ? "text-red-500" : "text-slate-900"} />
          <AdminStatCard label="Total Inventory Value" value={formatAed(summary.totalInventoryValue)} />
        </div>

        {mostUsedItems.length > 0 && (
          <>
            <h3 className="mt-8 font-semibold text-slate-900">Most Used Items</h3>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2.5">
                {mostUsedItems.map((i) => (
                  <div key={i.itemId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-900 font-medium">{i.displayName}</span>
                    <span className="text-slate-500">
                      {i.qtyUsed.toLocaleString()} {i.unit} used
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <h3 className="mt-8 font-semibold text-slate-900">Quick Links</h3>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/admin/inventory/items" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Inventory Items</div>
            <div className="text-sm text-slate-500 mt-0.5">Create and manage stock items.</div>
          </Link>
          <Link href="/admin/inventory/categories" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Categories</div>
            <div className="text-sm text-slate-500 mt-0.5">Add, rename, or deactivate categories and subcategories.</div>
          </Link>
          <Link href="/admin/inventory/main-warehouse" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Main Warehouse</div>
            <div className="text-sm text-slate-500 mt-0.5">Add stock, record supplier purchases, transfer to a branch.</div>
          </Link>
          <Link href="/admin/inventory/warehouse" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Branch Warehouses</div>
            <div className="text-sm text-slate-500 mt-0.5">View stock at Ajman, Al Ain, Dubai, Sharjah, and other branches.</div>
          </Link>
          <Link href="/admin/inventory/warehouses" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Warehouses</div>
            <div className="text-sm text-slate-500 mt-0.5">Manage the Main Warehouse and every Branch location.</div>
          </Link>
          <Link href="/admin/inventory/suppliers" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Suppliers</div>
            <div className="text-sm text-slate-500 mt-0.5">Manage the vendors inventory items can be linked to.</div>
          </Link>
          <Link href="/admin/inventory/labour" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Labour Catalog</div>
            <div className="text-sm text-slate-500 mt-0.5">Maintenance work types with a default price. No stock.</div>
          </Link>
          <Link href="/admin/inventory/distribute" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Distribute Stock</div>
            <div className="text-sm text-slate-500 mt-0.5">Transfer quantities from a warehouse to an employee.</div>
          </Link>
          <Link href="/admin/inventory/employees" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Employee Inventory</div>
            <div className="text-sm text-slate-500 mt-0.5">See exactly what every employee currently has.</div>
          </Link>
          <Link href="/admin/inventory/transactions" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Transactions</div>
            <div className="text-sm text-slate-500 mt-0.5">Every stock movement, searchable and filterable.</div>
          </Link>
          <Link href="/admin/inventory/requirements" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Requirements</div>
            <div className="text-sm text-slate-500 mt-0.5">Define how much stock each employee should have.</div>
          </Link>
          <Link href="/admin/inventory/requests" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Stock Requests</div>
            <div className="text-sm text-slate-500 mt-0.5">Approve (fully or partially) or reject employee stock requests.</div>
          </Link>
          <Link href="/admin/inventory/returns" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Returns</div>
            <div className="text-sm text-slate-500 mt-0.5">Approve or reject employee return requests.</div>
          </Link>
          <Link href="/admin/inventory/damaged" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Damaged Items</div>
            <div className="text-sm text-slate-500 mt-0.5">Every reported damage across all employees.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
