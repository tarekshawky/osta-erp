import { formatAed, formatDate } from "@/lib/format";
import { RENTAL_PAYMENT_STATUS_STYLES, RENT_EXPENSE_CATEGORY, type RentalTransactionRow } from "@/lib/rentalData";
import { RecordRentalPaymentModal } from "./RecordRentalPaymentModal";

export function RentalTransactionsTable({ transactions, showCompany = true }: { transactions: RentalTransactionRow[]; showCompany?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Due Date</th>
            {showCompany && <th className="px-4 py-3 font-medium">Company</th>}
            <th className="px-4 py-3 font-medium">Agreement</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Payment Method</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.dueDate)}</td>
              {showCompany && <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">{t.customerName}</td>}
              <td className="px-4 py-3 text-slate-600">{t.agreementName}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{RENT_EXPENSE_CATEGORY}</td>
              <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">-{formatAed(t.amount)}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RENTAL_PAYMENT_STATUS_STYLES[t.paymentStatus] ?? "bg-slate-100 text-slate-600"}`}>
                  {t.paymentStatus}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.paymentMethod ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {["Pending", "Due", "Overdue"].includes(t.paymentStatus) ? (
                  <RecordRentalPaymentModal
                    transactionId={t.id}
                    agreementName={t.agreementName}
                    amount={t.amount}
                    defaultPaymentMethod={t.paymentMethod ?? "Bank Transfer"}
                    trigger={<span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">Record Payment</span>}
                  />
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={showCompany ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                No rental transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
