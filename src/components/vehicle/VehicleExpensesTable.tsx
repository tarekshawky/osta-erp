import { formatAed, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { canonicalExpensePayment } from "@/lib/expenseData";

export type VehicleExpenseRow = {
  id: string;
  date: Date;
  subcategory: string | null;
  description: string;
  odometer: number | null;
  amount: number;
  payment: string;
  status: string;
  createdByName: string;
};

export function VehicleExpensesTable({ expenses }: { expenses: VehicleExpenseRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Odometer</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(exp.date)}</td>
              <td className="px-4 py-3 text-slate-900">{exp.subcategory ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">{exp.description}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{exp.createdByName}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {exp.odometer != null ? `${exp.odometer.toLocaleString()} KM` : "—"}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">-{formatAed(exp.amount)}</td>
              <td className="px-4 py-3 text-slate-600">{canonicalExpensePayment(exp.payment)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={exp.status} />
              </td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                No expenses recorded for this vehicle.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
