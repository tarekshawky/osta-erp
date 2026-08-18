import { formatAed } from "@/lib/format";
import { formatPeriodTitle } from "@/lib/financialReportsCore";
import type { IncomeStatement } from "@/lib/financialReportsIncomeStatement";
import { SignatoryBlock } from "./SignatoryBlock";

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

function Row({ label, value, bold, indent, topBorder }: { label: string; value: number; bold?: boolean; indent?: boolean; topBorder?: boolean }) {
  return (
    <tr className={`${bold ? "font-semibold" : ""} ${topBorder ? "border-t border-slate-300" : ""}`}>
      <td className={`py-1.5 ${indent ? "pl-6" : ""}`}>{label}</td>
      <td className="py-1.5 text-right tabular-nums">{formatAed(value)}</td>
    </tr>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={2} className="pt-4 pb-1 font-bold text-slate-900">
        {label}
      </td>
    </tr>
  );
}

export function IncomeStatementPreview({
  incomeStatement,
  from,
  to,
}: {
  incomeStatement: IncomeStatement;
  from: Date;
  to: Date;
}) {
  return (
    <div className="text-slate-900">
      <div className="text-center mb-6">
        <div className="font-bold text-lg">{COMPANY_NAME}</div>
        <div className="font-semibold mt-1">STATEMENT OF COMPREHENSIVE INCOME</div>
        <div className="text-sm text-slate-600 mt-0.5">{formatPeriodTitle(from, to)}</div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-slate-500">
            <td className="py-1.5"></td>
            <td className="py-1.5 text-right font-medium">AED</td>
          </tr>
        </thead>
        <tbody>
          <SectionHeader label="REVENUE" />
          <Row label="Service Revenue" value={incomeStatement.revenue.serviceRevenue} indent />
          <Row label="Other Revenue" value={incomeStatement.revenue.otherRevenue} indent />
          <Row label="TOTAL REVENUE" value={incomeStatement.revenue.total} bold />

          <Row label="Cost of Sales / Direct Costs" value={incomeStatement.costOfSales} />
          <Row label="GROSS PROFIT / (LOSS)" value={incomeStatement.grossProfit} bold />

          <SectionHeader label="ADMINISTRATIVE AND GENERAL EXPENSES" />
          {incomeStatement.adminExpenses.map((line) => (
            <Row key={line.label} label={line.label} value={line.amount} indent />
          ))}
          <Row label="TOTAL ADMINISTRATIVE AND GENERAL EXPENSES" value={incomeStatement.totalAdminExpenses} bold />

          <Row label="PROFIT / (LOSS) BEFORE TAX" value={incomeStatement.profitBeforeTax} bold topBorder />
          <Row label="Corporate Tax Expense" value={incomeStatement.corporateTaxExpense} />
          <Row label="PROFIT / (LOSS) FOR THE PERIOD" value={incomeStatement.profitForPeriod} bold topBorder />
        </tbody>
      </table>

      <SignatoryBlock />
      <div data-pdf-spacer />
    </div>
  );
}
