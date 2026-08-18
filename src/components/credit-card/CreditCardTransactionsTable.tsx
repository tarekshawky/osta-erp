"use client";

import { useState } from "react";
import { formatAed, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export type CreditCardTransactionRow = {
  id: string;
  number: string | null;
  date: Date;
  description: string;
  category: string | null;
  subcategory: string | null;
  amount: number;
  payment: string;
  vendor: string | null;
  referenceNumber: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  status: string;
  createdByName: string;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

export function CreditCardTransactionsTable({ transactions }: { transactions: CreditCardTransactionRow[] }) {
  const [selected, setSelected] = useState<CreditCardTransactionRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr
                key={t.id}
                onClick={() => setSelected(t)}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer"
              >
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.number ?? "—"}</td>
                <td className="px-4 py-3 text-slate-900">{t.description}</td>
                <td className="px-4 py-3 text-slate-600">{t.subcategory ?? t.category ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.createdByName}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">-{formatAed(t.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No transactions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Transaction Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-3">
              <DetailRow label="Number" value={selected.number ?? "—"} />
              <DetailRow label="Date" value={formatDate(selected.date)} />
              <DetailRow label="Description" value={selected.description} />
              <DetailRow label="Category" value={selected.subcategory ?? selected.category ?? "—"} />
              <DetailRow label="Amount" value={formatAed(selected.amount)} />
              <DetailRow label="Payment" value={selected.payment} />
              <DetailRow label="Vendor" value={selected.vendor ?? "—"} />
              <DetailRow label="Employee" value={selected.createdByName} />
              <DetailRow label="Reference Number" value={selected.referenceNumber ?? "—"} />
              <DetailRow label="Status" value={<StatusBadge status={selected.status} />} />
              <DetailRow
                label="Receipt"
                value={
                  selected.attachmentUrl ? (
                    <a href={selected.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                      View
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              {selected.notes && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">Notes</div>
                  <div className="text-sm text-slate-700">{selected.notes}</div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
