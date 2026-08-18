import type { EmployeeInventoryRow } from "@/lib/inventoryData";
import { ReturnStockModal } from "./ReturnStockModal";
import { DamagedLostModal } from "./DamagedLostModal";

const STATUS_STYLES: Record<string, string> = {
  Available: "bg-green-50 text-green-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Shortage: "bg-red-50 text-red-700",
  "Out of Stock": "bg-slate-100 text-slate-600",
};

export function EmployeeInventoryTable({
  employeeId,
  rows,
  warehouses,
}: {
  employeeId: string;
  rows: EmployeeInventoryRow[];
  warehouses: { id: string; name: string }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 py-4">No inventory items yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium text-right">Quantity</th>
            <th className="px-4 py-3 font-medium text-right">Required</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.itemId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-900 font-medium">{r.displayName}</td>
              <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                {r.current.toLocaleString()} {r.unit}
              </td>
              <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                {r.required != null ? `${r.required.toLocaleString()} ${r.unit}` : "—"}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <ReturnStockModal
                    employeeId={employeeId}
                    inventoryItemId={r.itemId}
                    displayName={r.displayName}
                    unit={r.unit}
                    currentQty={r.current}
                    warehouses={warehouses}
                  />
                  <DamagedLostModal
                    location={employeeId}
                    inventoryItemId={r.itemId}
                    displayName={r.displayName}
                    unit={r.unit}
                    currentQty={r.current}
                    employeeId={employeeId}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
