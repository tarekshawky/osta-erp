import { formatDate } from "@/lib/format";
import type { OdometerLogRow } from "@/lib/vehicleData";

export function VehicleMileageLog({ log }: { log: OdometerLogRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Odometer</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {[...log].reverse().map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{row.odometer.toLocaleString()} KM</td>
              <td className="px-4 py-3 text-slate-600">{row.subcategory ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">{row.description}</td>
            </tr>
          ))}
          {log.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                No odometer readings recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
