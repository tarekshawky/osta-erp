import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeCashFlowStatement } from "@/lib/financialReportsLedger";
import { suggestTaxPeriod, formatPeriodTitle } from "@/lib/financialReportsCore";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { from: fromParam, to: toParam } = await searchParams;

  let from: Date;
  let to: Date;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    const setting = await prisma.setting.findUnique({
      where: { id: SETTING_ID },
      select: { taxRegistrationEffectiveDate: true, firstTaxPeriodEnd: true },
    });
    const suggested = suggestTaxPeriod(setting ?? { taxRegistrationEffectiveDate: null, firstTaxPeriodEnd: null });
    from = suggested?.from ?? new Date(new Date().getFullYear(), 0, 1);
    to = suggested?.to ?? new Date();
  }

  const cashFlow = await computeCashFlowStatement({ from, to });

  return (
    <div className="pb-10">
      <AdminTopBar title="Cash Flow Statement" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Cash Flow Statement</h2>
        <p className="text-sm text-slate-500 mt-0.5">Direct method — Operating, Investing, Financing, reconciled to Cash &amp; Cash Equivalents.</p>

        <div className="mt-6">
          <DateRangeFilter from={toDateInputValue(from)} to={toDateInputValue(to)} />
        </div>

        <div className="mb-4">
          <ReportActions targetId="cash-flow-preview" fileName="cash-flow-statement" />
        </div>

        <ReportPreview id="cash-flow-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">CASH FLOW STATEMENT</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatPeriodTitle(from, to)}</div>
            </div>

            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Opening Cash &amp; Cash Equivalents</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(cashFlow.openingCash)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Net Cash from Operating Activities</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(cashFlow.operating)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Net Cash from Investing Activities</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(cashFlow.investing)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Net Cash from Financing Activities</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(cashFlow.financing)}</td>
                </tr>
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5">Net Change in Cash</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(cashFlow.netChange)}</td>
                </tr>
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5">Closing Cash &amp; Cash Equivalents</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(cashFlow.closingCash)}</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-3 text-xs text-slate-400">
              Investing = Asset purchases in the period. Financing = new Liability registrations minus Credit Card
              payments. Operating is the residual that reconciles Opening + Net Change to Closing.
            </p>

            <SignatoryBlock />
            <div data-pdf-spacer />
          </div>
        </ReportPreview>
      </div>
    </div>
  );
}
