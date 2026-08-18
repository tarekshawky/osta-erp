import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeIncomeStatement } from "@/lib/financialReportsIncomeStatement";
import { getPaymentTotals } from "@/lib/reportData";
import { buildCustomDateRange, suggestTaxPeriod, formatPeriodTitle } from "@/lib/financialReportsCore";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function RevenueReportPage({
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

  const [incomeStatement, paymentTotals] = await Promise.all([
    computeIncomeStatement({ from, to }),
    getPaymentTotals({ date: buildCustomDateRange(from, to) }),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title="Revenue Report" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Revenue Report</h2>
        <p className="text-sm text-slate-500 mt-0.5">Same accrual-basis Total Revenue as the Income Statement, broken out by payment method.</p>

        <div className="mt-6">
          <DateRangeFilter from={toDateInputValue(from)} to={toDateInputValue(to)} />
        </div>

        <div className="mb-4">
          <ReportActions targetId="revenue-report-preview" fileName="revenue-report" />
        </div>

        <ReportPreview id="revenue-report-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">REVENUE REPORT</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatPeriodTitle(from, to)}</div>
            </div>

            <table className="w-full text-sm mb-6">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Service Revenue</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(incomeStatement.revenue.serviceRevenue)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Other Revenue</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(incomeStatement.revenue.otherRevenue)}</td>
                </tr>
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5">TOTAL REVENUE</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(incomeStatement.revenue.total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="font-semibold mb-2">Paid Revenue by Payment Method</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Cash</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(paymentTotals.cash)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Ziina</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(paymentTotals.ziina)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Bank Transfer</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(paymentTotals.bankTransfer)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-400">
              Payment-method breakdown reflects only Paid invoices (cash actually collected); Total Revenue above is
              accrual-basis and also includes Unpaid invoices, which is why the two totals differ.
            </p>

            <SignatoryBlock />
            <div data-pdf-spacer />
          </div>
        </ReportPreview>
      </div>
    </div>
  );
}
