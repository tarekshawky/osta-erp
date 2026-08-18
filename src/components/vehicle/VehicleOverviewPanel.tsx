import { formatAed, formatDate } from "@/lib/format";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import type { ServiceDueStatus } from "@/lib/vehicleData";

export type TimelineExpense = {
  id: string;
  date: Date;
  subcategory: string | null;
  description: string;
  odometer: number | null;
  amount: number;
};

const TIMELINE_ICON: Record<string, string> = {
  "Petrol / Fuel": "⛽",
  Service: "🔧",
  Fine: "🚨",
  Maintenance: "🛠️",
  Insurance: "🛡️",
  Salik: "🛣️",
  Parking: "🅿️",
  Registration: "📋",
  Tires: "🛞",
  Battery: "🔋",
  "Car Wash": "🧽",
};

export function VehicleOverviewPanel({
  currentOdometer,
  lastServiceOdometer,
  nextServiceOdometer,
  serviceDueStatus,
  expenseTotals,
  timeline,
}: {
  currentOdometer: number;
  lastServiceOdometer: number | null;
  nextServiceOdometer: number | null;
  serviceDueStatus: ServiceDueStatus;
  expenseTotals: Record<string, number> & { grandTotal: number };
  timeline: TimelineExpense[];
}) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard label="Current Odometer" value={`${currentOdometer.toLocaleString()} KM`} />
        <AdminStatCard label="Last Service" value={lastServiceOdometer != null ? `${lastServiceOdometer.toLocaleString()} KM` : "—"} />
        <AdminStatCard
          label="Next Service"
          value={nextServiceOdometer != null ? `${nextServiceOdometer.toLocaleString()} KM` : "—"}
          valueClassName={
            serviceDueStatus === "Overdue" ? "text-red-600" : serviceDueStatus === "Due Soon" ? "text-amber-600" : "text-slate-900"
          }
        />
        <AdminStatCard label="Total Expenses" value={formatAed(expenseTotals.grandTotal)} valueClassName="text-red-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <AdminStatCard label="Fuel Expenses" value={formatAed(expenseTotals["Petrol / Fuel"] ?? 0)} />
        <AdminStatCard label="Service Expenses" value={formatAed(expenseTotals["Service"] ?? 0)} />
        <AdminStatCard label="Fine Expenses" value={formatAed(expenseTotals["Fine"] ?? 0)} />
        <AdminStatCard label="Other Expenses" value={formatAed(expenseTotals["Other"] ?? 0)} />
      </div>

      {(serviceDueStatus === "Due Soon" || serviceDueStatus === "Overdue") && nextServiceOdometer != null && (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm font-medium ${
            serviceDueStatus === "Overdue" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {serviceDueStatus === "Overdue" ? "🔴 Service Overdue" : "⚠️ Service Due Soon"} — Current {currentOdometer.toLocaleString()} KM,
          Due {nextServiceOdometer.toLocaleString()} KM (
          {serviceDueStatus === "Overdue"
            ? `overdue by ${(currentOdometer - nextServiceOdometer).toLocaleString()} KM`
            : `${(nextServiceOdometer - currentOdometer).toLocaleString()} KM remaining`}
          )
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h3>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {timeline.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">No activity yet.</p>}
          {timeline.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{TIMELINE_ICON[t.subcategory ?? ""] ?? "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900">{t.subcategory ?? "Other"} — {t.description}</div>
                <div className="text-xs text-slate-400">
                  {formatDate(t.date)}
                  {t.odometer != null && ` · ${t.odometer.toLocaleString()} KM`}
                </div>
              </div>
              <div className="text-sm font-semibold text-red-500 whitespace-nowrap">-{formatAed(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
