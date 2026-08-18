import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { formatAed } from "@/lib/format";
import { computeInventoryDashboardSummary } from "@/lib/inventoryData";

export default async function InventoryDashboardPage() {
  const summary = await computeInventoryDashboardSummary();

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
          <AdminStatCard label="Main Warehouse" value={summary.mainStock.toLocaleString()} />
          <AdminStatCard label="Employee Stock" value={summary.employeeStock.toLocaleString()} />
          <AdminStatCard label="Low Stock" value={String(summary.lowStock)} valueClassName={summary.lowStock > 0 ? "text-amber-600" : "text-slate-900"} />
          <AdminStatCard label="Out of Stock" value={String(summary.outOfStock)} valueClassName={summary.outOfStock > 0 ? "text-red-500" : "text-slate-900"} />
          <AdminStatCard label="Employees With Shortages" value={String(summary.employeesWithShortages)} valueClassName={summary.employeesWithShortages > 0 ? "text-red-500" : "text-slate-900"} />
          <AdminStatCard label="Total Inventory Value" value={formatAed(summary.totalInventoryValue)} />
        </div>

        <h3 className="mt-8 font-semibold text-slate-900">Quick Links</h3>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/admin/inventory/items" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Inventory Items</div>
            <div className="text-sm text-slate-500 mt-0.5">Create and manage stock items.</div>
          </Link>
          <Link href="/admin/inventory/warehouse" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">Main Warehouse</div>
            <div className="text-sm text-slate-500 mt-0.5">Add stock, record supplier purchases, view stock levels.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
