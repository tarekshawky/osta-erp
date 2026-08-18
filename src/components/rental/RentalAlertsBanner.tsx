import type { RentalAlert } from "@/lib/rentalData";

const ALERT_ICON: Record<RentalAlert["kind"], string> = {
  "Upcoming Rent": "🔔",
  "Overdue Rent": "⚠️",
};

export function RentalAlertsBanner({ alerts }: { alerts: RentalAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-semibold text-amber-800 mb-2">Rental Alerts ({alerts.length})</div>
      <div className="flex flex-col gap-1.5">
        {alerts.map((a, i) => (
          <div key={i} className="text-sm text-amber-700 flex items-center gap-2">
            <span>{ALERT_ICON[a.kind]}</span>
            <span className="font-medium">{a.customerName}</span>
            <span>— {a.kind}:</span>
            <span>{a.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
