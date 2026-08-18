import type { InventoryTransactionRow } from "@/lib/inventoryData";

const TYPE_STYLES: Record<string, string> = {
  "Stock Received": "bg-green-50 text-green-700",
  "Stock Transfer": "bg-blue-50 text-blue-700",
  "Stock Used": "bg-slate-100 text-slate-600",
  "Stock Returned": "bg-cyan-50 text-cyan-700",
  "Stock Damaged": "bg-red-50 text-red-700",
  "Stock Lost": "bg-red-50 text-red-700",
  "Stock Adjustment": "bg-amber-50 text-amber-700",
  "Stock Reversed": "bg-purple-50 text-purple-700",
};

export function InventoryTransactionsTable({ rows }: { rows: InventoryTransactionRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium text-right">Quantity</th>
            <th className="px-4 py-3 font-medium">From</th>
            <th className="px-4 py-3 font-medium">To</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Created By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-slate-900 font-medium">{r.itemDisplayName}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_STYLES[r.type] ?? "bg-slate-100 text-slate-600"}`}>
                  {r.type}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                {r.quantity.toLocaleString()} {r.unit}
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.fromLabel}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.toLabel}</td>
              <td className="px-4 py-3 text-slate-600">{r.reference ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.createdByName}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                No inventory transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
