import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeIncomeStatement } from "@/lib/financialReportsIncomeStatement";
import { suggestTaxPeriod } from "@/lib/financialReportsCore";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { IncomeStatementPreview } from "@/components/financial-reports/IncomeStatementPreview";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function IncomeStatementPage({
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

  const incomeStatement = await computeIncomeStatement({ from, to });

  return (
    <div className="pb-10">
      <AdminTopBar title="Statement of Comprehensive Income" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Statement of Comprehensive Income</h2>
        <p className="text-sm text-slate-500 mt-0.5">Income Statement — computed live from Invoices, Expenses, and Payroll.</p>

        <div className="mt-6">
          <DateRangeFilter from={toDateInputValue(from)} to={toDateInputValue(to)} />
        </div>

        <div className="mb-4">
          <ReportActions targetId="income-statement-preview" fileName="statement-of-comprehensive-income" />
        </div>

        <ReportPreview id="income-statement-preview">
          <IncomeStatementPreview incomeStatement={incomeStatement} from={from} to={to} />
        </ReportPreview>
      </div>
    </div>
  );
}
