import { formatAed } from "@/lib/format";
import type { EmployeeInventoryReport, InventoryTransactionRow } from "@/lib/inventoryData";
import { ReplenishModal } from "./ReplenishModal";

const STATUS_STYLES: Record<string, string> = {
  Available: "bg-green-50 text-green-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Shortage: "bg-red-50 text-red-700",
  "Out of Stock": "bg-slate-100 text-slate-600",
};

function StatCard({ label, value, valueClassName = "text-slate-900" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${valueClassName}`}>{value}</div>
    </div>
  );
}

export function EmployeeInventoryReportPanel({
  employeeId,
  report,
  movementHistory,
  warehouses,
}: {
  employeeId: string;
  report: EmployeeInventoryReport;
  movementHistory: InventoryTransactionRow[];
  warehouses: { id: string; name: string }[];
}) {
  const { rows, summary, value } = report;
  const neededRows = rows.filter((r) => r.needed > 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Inventory Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total Different Items" value={String(summary.totalDifferentItems)} />
          <StatCard label="Total Current Quantity" value={summary.totalCurrentQuantity.toLocaleString()} />
          <StatCard label="Items Used" value={summary.itemsUsed.toLocaleString()} />
          <StatCard label="Items Returned" value={summary.itemsReturned.toLocaleString()} />
          <StatCard label="Damaged" value={summary.damaged.toLocaleString()} valueClassName={summary.damaged > 0 ? "text-red-500" : "text-slate-900"} />
          <StatCard label="Lost" value={summary.lost.toLocaleString()} valueClassName={summary.lost > 0 ? "text-red-500" : "text-slate-900"} />
          <StatCard label="Low Stock Items" value={String(summary.lowStockItems)} valueClassName={summary.lowStockItems > 0 ? "text-amber-600" : "text-slate-900"} />
          <StatCard label="Out of Stock Items" value={String(summary.outOfStockItems)} valueClassName={summary.outOfStockItems > 0 ? "text-red-500" : "text-slate-900"} />
          <StatCard label="Total Items Needed" value={summary.totalItemsNeeded.toLocaleString()} valueClassName={summary.totalItemsNeeded > 0 ? "text-red-500" : "text-slate-900"} />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Inventory Value</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Current Inventory Value" value={formatAed(value.currentValue)} />
          <StatCard label="Used Inventory Cost" value={formatAed(value.usedCost)} />
          <StatCard label="Damaged/Lost Cost" value={formatAed(value.damagedLostCost)} valueClassName={value.damagedLostCost > 0 ? "text-red-500" : "text-slate-900"} />
          <StatCard label="Shortage Value" value={formatAed(value.shortageValue)} valueClassName={value.shortageValue > 0 ? "text-red-500" : "text-slate-900"} />
        </div>
      </div>

      {neededRows.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Items Needed</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium text-right">Current</th>
                  <th className="px-4 py-3 font-medium text-right">Required</th>
                  <th className="px-4 py-3 font-medium text-right">Needed</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {neededRows.map((r) => (
                  <tr key={r.itemId} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 text-slate-900 font-medium">{r.displayName}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.current.toLocaleString()} {r.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{(r.required ?? 0).toLocaleString()} {r.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">{r.needed.toLocaleString()} {r.unit}</td>
                    <td className="px-4 py-3">
                      <ReplenishModal employeeId={employeeId} inventoryItemId={r.itemId} displayName={r.displayName} unit={r.unit} recommendedQuantity={r.needed} warehouses={warehouses} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Total: <span className="font-semibold text-slate-900">{summary.totalItemsNeeded.toLocaleString()} units needed</span>
          </p>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Current Inventory</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium text-right">Received</th>
                <th className="px-4 py-3 font-medium text-right">Used</th>
                <th className="px-4 py-3 font-medium text-right">Returned</th>
                <th className="px-4 py-3 font-medium text-right">Damaged</th>
                <th className="px-4 py-3 font-medium text-right">Lost</th>
                <th className="px-4 py-3 font-medium text-right">Current</th>
                <th className="px-4 py-3 font-medium text-right">Required</th>
                <th className="px-4 py-3 font-medium text-right">Needed</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-900 font-medium">{r.displayName}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.received.toLocaleString()} {r.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.used.toLocaleString()} {r.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.returned.toLocaleString()} {r.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.damaged.toLocaleString()} {r.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.lost.toLocaleString()} {r.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">{r.current.toLocaleString()} {r.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.required != null ? `${r.required.toLocaleString()} ${r.unit}` : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{r.needed > 0 ? `${r.needed.toLocaleString()} ${r.unit}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    No inventory items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Inventory Movement History</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Transaction</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {movementHistory.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{t.itemDisplayName}</td>
                  <td className="px-4 py-3 text-slate-600">{t.type}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                    {t.toLabel !== "—" && t.toLabel !== "Main Warehouse" ? "+" : "-"}{t.quantity.toLocaleString()} {t.unit}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.reference ?? "—"}</td>
                </tr>
              ))}
              {movementHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No movement history yet.
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
