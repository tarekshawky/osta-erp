import { formatAed, formatDate } from "@/lib/format";
import type { ServiceRow } from "@/lib/vehicleData";

export function VehicleServiceTable({ history }: { history: ServiceRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Odometer</th>
            <th className="px-4 py-3 font-medium">KM Since Previous</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {[...history].reverse().map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
              <td className="px-4 py-3 text-slate-900">{row.detailType ?? "Service"}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.odometer.toLocaleString()} KM</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {row.kmSincePrevious != null ? `${row.kmSincePrevious.toLocaleString()} KM` : "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">{row.vendor ?? "—"}</td>
              <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">-{formatAed(row.amount)}</td>
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                No service history recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
