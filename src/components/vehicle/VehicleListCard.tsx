import Link from "next/link";
import { formatAed } from "@/lib/format";
import type { ServiceDueStatus } from "@/lib/vehicleData";

export type VehicleRow = {
  id: string;
  name: string;
  owner: string | null;
  plateNumber: string | null;
  status: string;
  currentOdometer: number;
  nextServiceOdometer: number | null;
  serviceDueStatus: ServiceDueStatus;
  totalExpenses: number;
};

const SERVICE_DUE_STYLES: Record<ServiceDueStatus, string> = {
  OK: "bg-green-50 text-green-700",
  "Due Soon": "bg-amber-50 text-amber-600",
  Overdue: "bg-red-50 text-red-600",
  Unknown: "bg-slate-100 text-slate-500",
};

export function VehicleListCard({ vehicle, onEdit }: { vehicle: VehicleRow; onEdit?: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-900">{vehicle.name}</div>
          <div className="text-sm text-slate-500 mt-0.5">{vehicle.plateNumber ?? "—"}</div>
        </div>
        <div className="flex items-center gap-2">
          {vehicle.status === "Inactive" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SERVICE_DUE_STYLES[vehicle.serviceDueStatus]}`}>
            {vehicle.serviceDueStatus === "Unknown" ? "No Service Data" : vehicle.serviceDueStatus}
          </span>
          {onEdit && (
            <button type="button" onClick={onEdit} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Current Odometer</div>
          <div className="font-semibold text-slate-900">{vehicle.currentOdometer.toLocaleString()} KM</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Next Service</div>
          <div className="font-semibold text-slate-900">
            {vehicle.nextServiceOdometer != null ? `${vehicle.nextServiceOdometer.toLocaleString()} KM` : "—"}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-xs text-slate-400">Total Expenses</div>
          <div className="font-semibold text-red-600">{formatAed(vehicle.totalExpenses)}</div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href={`/admin/vehicles/${vehicle.id}`}
          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}
