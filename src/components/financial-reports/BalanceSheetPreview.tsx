import { formatAed } from "@/lib/format";
import { formatAsAtTitle } from "@/lib/financialReportsCore";
import type { BalanceSheet } from "@/lib/financialReportsBalanceSheet";
import { SignatoryBlock } from "./SignatoryBlock";

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

function Row({
  label,
  currentValue,
  comparativeValue,
  hasComparative,
  bold,
  indent,
  topBorder,
}: {
  label: string;
  currentValue: number;
  comparativeValue?: number;
  hasComparative: boolean;
  bold?: boolean;
  indent?: boolean;
  topBorder?: boolean;
}) {
  return (
    <tr className={`${bold ? "font-semibold" : ""} ${topBorder ? "border-t border-slate-300" : ""}`}>
      <td className={`py-1.5 ${indent ? "pl-6" : ""}`}>{label}</td>
      <td className="py-1.5 text-right tabular-nums">{formatAed(currentValue)}</td>
      {hasComparative && <td className="py-1.5 text-right tabular-nums">{formatAed(comparativeValue ?? 0)}</td>}
    </tr>
  );
}

function SectionHeader({ label, hasComparative }: { label: string; hasComparative: boolean }) {
  return (
    <tr>
      <td colSpan={hasComparative ? 3 : 2} className="pt-4 pb-1 font-bold text-slate-900">
        {label}
      </td>
    </tr>
  );
}

export function BalanceSheetPreview({ balanceSheet }: { balanceSheet: BalanceSheet }) {
  const { current, comparative } = balanceSheet;
  const hasComparative = comparative != null;

  return (
    <div className="text-slate-900">
      <div className="text-center mb-6">
        <div className="font-bold text-lg">{COMPANY_NAME}</div>
        <div className="font-semibold mt-1">STATEMENT OF FINANCIAL POSITION</div>
        <div className="text-sm text-slate-600 mt-0.5">{formatAsAtTitle(current.asOfDate)}</div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-slate-500">
            <td className="py-1.5"></td>
            <td className="py-1.5 text-right font-medium">
              AED
              <div className="text-xs font-normal">{current.asOfDate.toISOString().slice(0, 10)}</div>
            </td>
            {hasComparative && comparative && (
              <td className="py-1.5 text-right font-medium">
                AED
                <div className="text-xs font-normal">{comparative.asOfDate.toISOString().slice(0, 10)}</div>
              </td>
            )}
          </tr>
        </thead>
        <tbody>
          <SectionHeader label="ASSETS" hasComparative={hasComparative} />

          <tr>
            <td colSpan={hasComparative ? 3 : 2} className="pt-2 pb-1 font-medium text-slate-700">
              Non-Current Assets
            </td>
          </tr>
          <Row
            label="Property, Plant and Equipment"
            currentValue={current.assets.nonCurrent.propertyPlantEquipment}
            comparativeValue={comparative?.assets.nonCurrent.propertyPlantEquipment}
            hasComparative={hasComparative}
            indent
          />

          <tr>
            <td colSpan={hasComparative ? 3 : 2} className="pt-3 pb-1 font-medium text-slate-700">
              Current Assets
            </td>
          </tr>
          <Row
            label="Cash and Cash Equivalents"
            currentValue={current.assets.current.cashAndCashEquivalents}
            comparativeValue={comparative?.assets.current.cashAndCashEquivalents}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Accounts Receivable"
            currentValue={current.assets.current.accountsReceivable}
            comparativeValue={comparative?.assets.current.accountsReceivable}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Advances, Deposits & Prepayments"
            currentValue={current.assets.current.advancesDepositsPrepayments}
            comparativeValue={comparative?.assets.current.advancesDepositsPrepayments}
            hasComparative={hasComparative}
            indent
          />

          <Row
            label="TOTAL ASSETS"
            currentValue={current.totalAssets}
            comparativeValue={comparative?.totalAssets}
            hasComparative={hasComparative}
            bold
          />

          <SectionHeader label="LIABILITIES" hasComparative={hasComparative} />

          <tr>
            <td colSpan={hasComparative ? 3 : 2} className="pt-2 pb-1 font-medium text-slate-700">
              Non-Current Liabilities
            </td>
          </tr>
          <Row
            label="Bank Borrowings"
            currentValue={current.liabilities.nonCurrent.bankBorrowings}
            comparativeValue={comparative?.liabilities.nonCurrent.bankBorrowings}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Other Non-Current Liabilities"
            currentValue={current.liabilities.nonCurrent.otherNonCurrentLiabilities}
            comparativeValue={comparative?.liabilities.nonCurrent.otherNonCurrentLiabilities}
            hasComparative={hasComparative}
            indent
          />

          <tr>
            <td colSpan={hasComparative ? 3 : 2} className="pt-3 pb-1 font-medium text-slate-700">
              Current Liabilities
            </td>
          </tr>
          <Row
            label="Trade Accounts Payable"
            currentValue={current.liabilities.current.tradeAccountsPayable}
            comparativeValue={comparative?.liabilities.current.tradeAccountsPayable}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Other Payables"
            currentValue={current.liabilities.current.otherPayables}
            comparativeValue={comparative?.liabilities.current.otherPayables}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Bank Borrowings"
            currentValue={current.liabilities.current.bankBorrowings}
            comparativeValue={comparative?.liabilities.current.bankBorrowings}
            hasComparative={hasComparative}
            indent
          />

          <SectionHeader label="EQUITY" hasComparative={hasComparative} />
          <Row
            label="Share Capital"
            currentValue={current.equity.shareCapital}
            comparativeValue={comparative?.equity.shareCapital}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Statutory Reserves"
            currentValue={current.equity.statutoryReserves}
            comparativeValue={comparative?.equity.statutoryReserves}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Retained Earnings"
            currentValue={current.equity.retainedEarnings}
            comparativeValue={comparative?.equity.retainedEarnings}
            hasComparative={hasComparative}
            indent
          />
          <Row
            label="Shareholder's Current Account"
            currentValue={current.equity.shareholdersCurrentAccount}
            comparativeValue={comparative?.equity.shareholdersCurrentAccount}
            hasComparative={hasComparative}
            indent
          />

          <Row
            label="TOTAL EQUITY AND LIABILITIES"
            currentValue={current.totalLiabilitiesAndEquity}
            comparativeValue={comparative?.totalLiabilitiesAndEquity}
            hasComparative={hasComparative}
            bold
            topBorder
          />
        </tbody>
      </table>

      <SignatoryBlock />
      <div data-pdf-spacer />
    </div>
  );
}
