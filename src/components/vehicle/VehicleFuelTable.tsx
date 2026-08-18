import { formatAed, formatDate } from "@/lib/format";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import type { FuelRow, FuelSummary } from "@/lib/vehicleData";

export function VehicleFuelTable({ history, summary }: { history: FuelRow[]; summary: FuelSummary }) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <AdminStatCard label="Total Fuel Cost" value={formatAed(summary.totalCost)} valueClassName="text-red-600" />
        <AdminStatCard label="Total Liters" value={`${summary.totalLiters.toLocaleString()} L`} />
        <AdminStatCard label="Avg KM/L" value={summary.avgKmPerLiter != null ? summary.avgKmPerLiter.toFixed(2) : "—"} />
        <AdminStatCard label="Avg Cost/KM" value={summary.avgCostPerKm != null ? formatAed(summary.avgCostPerKm) : "—"} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Station</th>
              <th className="px-4 py-3 font-medium">Liters</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Odometer</th>
              <th className="px-4 py-3 font-medium">KM/L</th>
              <th className="px-4 py-3 font-medium">Cost/KM</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
                <td className="px-4 py-3 text-slate-900">{row.vendor ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.liters != null ? `${row.liters} L` : "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">-{formatAed(row.amount)}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.odometer.toLocaleString()} KM</td>
                <td className="px-4 py-3 text-slate-600">{row.kmPerLiter != null ? row.kmPerLiter.toFixed(2) : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.costPerKm != null ? formatAed(row.costPerKm) : "—"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No fuel history recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
