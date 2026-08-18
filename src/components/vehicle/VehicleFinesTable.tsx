import { formatAed, formatDate } from "@/lib/format";
import { deriveFineStatus, type FineStatus } from "@/lib/vehicleData";

export type FineRow = {
  id: string;
  date: Date;
  detailType: string | null;
  referenceNumber: string | null;
  responsibleEmployeeName: string | null;
  odometer: number | null;
  amount: number;
  companyAmount: number | null;
  employeeAmount: number | null;
  installmentCount: number;
  totalInstallments: number;
};

const STATUS_STYLES: Record<FineStatus, string> = {
  "Company Covered": "bg-slate-100 text-slate-600",
  "Pending Employee Deduction": "bg-amber-50 text-amber-600",
  "Partially Deducted": "bg-sky-50 text-sky-600",
  "Fully Deducted": "bg-green-50 text-green-700",
};

export function VehicleFinesTable({ fines }: { fines: FineRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Odometer</th>
            <th className="px-4 py-3 font-medium text-right">Fine</th>
            <th className="px-4 py-3 font-medium text-right">Company</th>
            <th className="px-4 py-3 font-medium text-right">Employee</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {fines.map((f) => {
            const status = deriveFineStatus(f.employeeAmount, f.installmentCount, f.totalInstallments);
            return (
              <tr key={f.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(f.date)}</td>
                <td className="px-4 py-3 text-slate-900">{f.detailType ?? "Fine"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{f.responsibleEmployeeName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {f.odometer != null ? `${f.odometer.toLocaleString()} KM` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">-{formatAed(f.amount)}</td>
                <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatAed(f.companyAmount ?? f.amount)}</td>
                <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatAed(f.employeeAmount ?? 0)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>{status}</span>
                </td>
              </tr>
            );
          })}
          {fines.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                No fines recorded for this vehicle.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
