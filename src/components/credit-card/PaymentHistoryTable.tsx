import { formatAed, formatDate } from "@/lib/format";

export type PaymentHistoryRow = {
  id: string;
  date: Date;
  amount: number;
  paymentMethod: string;
  bankAccount: string | null;
  referenceNumber: string | null;
  notes: string | null;
  recordedByName: string;
};

export function PaymentHistoryTable({ payments }: { payments: PaymentHistoryRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Bank Account</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Recorded By</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(p.date)}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">{formatAed(p.amount)}</td>
              <td className="px-4 py-3 text-slate-600">{p.paymentMethod}</td>
              <td className="px-4 py-3 text-slate-600">{p.bankAccount ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">{p.referenceNumber ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.recordedByName}</td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                No payments recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
