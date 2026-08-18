import { formatAed } from "@/lib/format";

// The Balance Sheet's figures are independently derived from different sources
// (Cash netting, AR from invoices, Retained Earnings from the Income Statement
// engine, Shareholder's Current Account from a wallet formula) -- they are NOT
// guaranteed to balance by construction, unlike a true double-entry ledger. This
// alert is the deliberate check that catches drift, not a bug indicator.
export function BalanceAlert({ isBalanced, difference }: { isBalanced: boolean; difference: number }) {
  if (isBalanced) return null;

  return (
    <div className="no-print mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-semibold">⚠️ Financial Statement is not balanced.</span>{" "}
      Difference: {formatAed(Math.abs(difference))} ({difference > 0 ? "Total Assets exceed Total Liabilities and Equity" : "Total Liabilities and Equity exceed Total Assets"}).
    </div>
  );
}
