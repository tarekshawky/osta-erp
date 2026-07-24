import { PAYROLL_TYPE_LABELS, PAYROLL_TYPE_STYLES } from "@/lib/payrollData";

export function PayrollTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAYROLL_TYPE_STYLES[type] ?? "bg-slate-100 text-slate-600"}`}
    >
      {PAYROLL_TYPE_LABELS[type] ?? type}
    </span>
  );
}
