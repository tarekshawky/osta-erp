import { formatAed } from "@/lib/format";
import { MAIN_LOCATION, type MainWarehouseRow } from "@/lib/inventoryData";
import { AdjustStockModal } from "./AdjustStockModal";

const STATUS_STYLES: Record<string, string> = {
  OK: "bg-green-50 text-green-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

export function MainWarehouseTable({ rows }: { rows: MainWarehouseRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium text-right">Main Warehouse</th>
            <th className="px-4 py-3 font-medium text-right">Employee Stock</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium text-right">Value</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.itemId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-900 font-medium">{r.displayName}</td>
              <td className="px-4 py-3 text-slate-600">{r.category}</td>
              <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                {r.mainQty.toLocaleString()} {r.unit}
              </td>
              <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                {r.employeeQty.toLocaleString()} {r.unit}
              </td>
              <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                {r.totalQty.toLocaleString()} {r.unit}
              </td>
              <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                {r.costPrice != null ? formatAed(r.mainQty * r.costPrice) : "—"}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <AdjustStockModal
                  location={MAIN_LOCATION}
                  inventoryItemId={r.itemId}
                  displayName={r.displayName}
                  unit={r.unit}
                  currentQty={r.mainQty}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                No active inventory items yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
