const STYLES: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Recorded: "bg-green-50 text-green-700",
  Unpaid: "bg-amber-50 text-amber-600",
  Refunded: "bg-red-50 text-red-600",
  "Partially Refunded": "bg-orange-50 text-orange-600",
  Pending: "bg-amber-50 text-amber-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STYLES[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
