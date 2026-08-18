import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeShareholdersCurrentAccount } from "@/lib/financialReportsBalanceSheet";
import { computeRetainedEarnings } from "@/lib/financialReportsIncomeStatement";
import { formatAsAtTitle } from "@/lib/financialReportsCore";
import { AsOfDateControl } from "@/components/financial-reports/AsOfDateControl";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function EquityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { asOf } = await searchParams;
  const asOfDate = asOf ? new Date(asOf) : new Date();

  const setting = await prisma.setting.findUnique({
    where: { id: SETTING_ID },
    select: { shareCapital: true, statutoryReserves: true, shareholderEmployeeId: true, shareholderEmployee: { select: { name: true } } },
  });

  const [retainedEarnings, shareholdersCurrentAccount] = await Promise.all([
    computeRetainedEarnings(asOfDate),
    computeShareholdersCurrentAccount(asOfDate, setting?.shareholderEmployeeId ?? null),
  ]);

  const shareCapital = setting?.shareCapital ?? 0;
  const statutoryReserves = setting?.statutoryReserves ?? 0;
  const total = shareCapital + statutoryReserves + retainedEarnings + shareholdersCurrentAccount;

  return (
    <div className="pb-10">
      <AdminTopBar title="Equity Report" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Equity Report</h2>
        <p className="text-sm text-slate-500 mt-0.5">Same figures as the Balance Sheet&apos;s Equity section, each shown with its source.</p>

        <div className="mt-6">
          <AsOfDateControl asOf={toDateInputValue(asOfDate)} />
        </div>

        <div className="mb-4">
          <ReportActions
            targetId="equity-report-preview"
            fileName="equity-report"
            excelHref={`/admin/financial-reports/export?report=equity-report&asOf=${toDateInputValue(asOfDate)}`}
          />
        </div>

        <ReportPreview id="equity-report-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">EQUITY REPORT</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatAsAtTitle(asOfDate)}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Equity Component</th>
                  <th className="py-1.5 font-medium">Source</th>
                  <th className="py-1.5 font-medium text-right">Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Share Capital</td>
                  <td className="py-1.5 text-xs text-slate-400">Company Settings — Equity &amp; Signatory</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(shareCapital)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Statutory Reserves</td>
                  <td className="py-1.5 text-xs text-slate-400">Company Settings — Equity &amp; Signatory</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(statutoryReserves)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Retained Earnings</td>
                  <td className="py-1.5 text-xs text-slate-400">Cumulative Profit for the Period, all prior periods</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(retainedEarnings)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Shareholder&apos;s Current Account</td>
                  <td className="py-1.5 text-xs text-slate-400">
                    {setting?.shareholderEmployee?.name ?? "No shareholder configured"} — Wallet position (custody + cash − expenses)
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(shareholdersCurrentAccount)}</td>
                </tr>
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5" colSpan={2}>
                    TOTAL EQUITY
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(total)}</td>
                </tr>
              </tbody>
            </table>

            <SignatoryBlock />
            <div data-pdf-spacer />
          </div>
        </ReportPreview>
      </div>
    </div>
  );
}
