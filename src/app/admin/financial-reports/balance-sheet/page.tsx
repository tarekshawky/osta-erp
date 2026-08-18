import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeBalanceSheet } from "@/lib/financialReportsBalanceSheet";
import { BalanceSheetDateControls } from "@/components/financial-reports/BalanceSheetDateControls";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { BalanceAlert } from "@/components/financial-reports/BalanceAlert";
import { BalanceSheetPreview } from "@/components/financial-reports/BalanceSheetPreview";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultComparativeDate(asOfDate: Date): Date {
  const year = asOfDate.getUTCMonth() === 0 && asOfDate.getUTCDate() === 1 ? asOfDate.getUTCFullYear() - 2 : asOfDate.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 11, 31));
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string; comparative?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { asOf, comparative } = await searchParams;

  const asOfDate = asOf ? new Date(asOf) : new Date();
  const comparativeDate = comparative ? new Date(comparative) : defaultComparativeDate(asOfDate);

  const balanceSheet = await computeBalanceSheet({ asOfDate, comparativeDate });

  return (
    <div className="pb-10">
      <AdminTopBar title="Statement of Financial Position" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Statement of Financial Position</h2>
        <p className="text-sm text-slate-500 mt-0.5">Balance Sheet — computed live from Invoices, Expenses, Assets, Liabilities, and Payroll.</p>

        <div className="mt-6 no-print">
          <BalanceSheetDateControls asOf={toDateInputValue(asOfDate)} comparative={toDateInputValue(comparativeDate)} />
        </div>

        <BalanceAlert isBalanced={balanceSheet.current.isBalanced} difference={balanceSheet.current.difference} />

        <div className="mb-4">
          <ReportActions targetId="balance-sheet-preview" fileName="statement-of-financial-position" />
        </div>

        <ReportPreview id="balance-sheet-preview">
          <BalanceSheetPreview balanceSheet={balanceSheet} />
        </ReportPreview>
      </div>
    </div>
  );
}
