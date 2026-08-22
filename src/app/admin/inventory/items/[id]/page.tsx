import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { formatAed } from "@/lib/format";
import { getInventoryItemDisplayName, getItemStockBreakdown } from "@/lib/inventoryData";

export default async function ItemDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { supplier: { select: { name: true } } } });
  if (!item) notFound();

  const breakdown = await getItemStockBreakdown(id);

  return (
    <div className="pb-10">
      <AdminTopBar title="Item Details" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">{getInventoryItemDisplayName(item)}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {item.sku ? `SKU: ${item.sku} · ` : ""}
            {item.category}
            {item.subcategory ? ` / ${item.subcategory}` : ""}
            {item.supplier ? ` · Supplier: ${item.supplier.name}` : ""}
          </p>
        </div>

        <h3 className="font-semibold text-slate-900 mb-3">Stock Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Main Warehouse</div>
            <div className="text-2xl font-bold mt-1 text-slate-900">
              {breakdown.mainQty.toLocaleString()} {item.unit}
            </div>
          </div>
          {breakdown.branches.map((b) => (
            <div key={b.warehouseId} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">{b.name}</div>
              <div className="text-2xl font-bold mt-1 text-slate-900">
                {b.qty.toLocaleString()} {item.unit}
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Employees Assigned</div>
            <div className="text-2xl font-bold mt-1 text-slate-900">{breakdown.employees.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Total Stock</div>
            <div className="text-2xl font-bold mt-1 text-blue-700">
              {breakdown.totalStock.toLocaleString()} {item.unit}
            </div>
          </div>
          {item.costPrice != null && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Total Stock Value</div>
              <div className="text-2xl font-bold mt-1 text-slate-900">{formatAed(breakdown.totalStock * item.costPrice)}</div>
            </div>
          )}
        </div>

        <h3 className="font-semibold text-slate-900 mb-3">Employee Distribution</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.employees.map((e) => (
                <tr key={e.employeeId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-900 font-medium">
                    <Link href={`/admin/employees/${e.employeeId}`} className="hover:text-blue-600">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.teamName ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-900 whitespace-nowrap">
                    {e.qty.toLocaleString()} {item.unit}
                  </td>
                </tr>
              ))}
              {breakdown.employees.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                    No employees currently hold this item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
