import { formatAed } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/reportData";
import type { MonthlyStatement } from "@/lib/creditCardData";

export function MonthlyStatementCard({
  statement,
  years,
}: {
  statement: MonthlyStatement;
  years: number[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <form method="get" className="flex items-center gap-2 flex-wrap">
        <input type="hidden" name="tab" value="statement" />
        <select
          name="statementYear"
          defaultValue={statement.year}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="statementMonth"
          defaultValue={statement.month}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2">
          View Statement
        </button>
      </form>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-slate-400">Opening Balance</div>
          <div className="font-semibold text-slate-900 mt-0.5">{formatAed(statement.openingBalance)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Expenses</div>
          <div className="font-semibold text-red-500 mt-0.5">{formatAed(statement.totalExpenses)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Payments</div>
          <div className="font-semibold text-green-600 mt-0.5">{formatAed(statement.totalPayments)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Closing / Outstanding</div>
          <div className="font-semibold text-slate-900 mt-0.5">{formatAed(statement.outstanding)}</div>
        </div>
      </div>
    </div>
  );
}
