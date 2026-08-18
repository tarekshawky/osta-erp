import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { getTrialBalance } from "@/lib/financialReportsLedger";
import { suggestTaxPeriod, formatPeriodTitle } from "@/lib/financialReportsCore";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function TrialBalancePage({
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

  const { rows, totalDebit, totalCredit } = await getTrialBalance({ from, to });
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01;

  return (
    <div className="pb-10">
      <AdminTopBar title="Trial Balance" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Trial Balance</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Same underlying transactions bucketed on both sides — debit and credit totals always tie out exactly.
        </p>

        <div className="mt-6">
          <DateRangeFilter from={toDateInputValue(from)} to={toDateInputValue(to)} />
        </div>

        <div className="mb-4">
          <ReportActions targetId="trial-balance-preview" fileName="trial-balance" />
        </div>

        <ReportPreview id="trial-balance-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">TRIAL BALANCE</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatPeriodTitle(from, to)}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Account</th>
                  <th className="py-1.5 font-medium text-right">Debit</th>
                  <th className="py-1.5 font-medium text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.account} className="border-b border-slate-100">
                    <td className="py-1.5">{r.account}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.debit ? formatAed(r.debit) : ""}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.credit ? formatAed(r.credit) : ""}</td>
                  </tr>
                ))}
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5">TOTAL</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(totalDebit)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(totalCredit)}</td>
                </tr>
              </tbody>
            </table>

            <p className={`mt-3 text-sm font-medium ${isBalanced ? "text-green-600" : "text-red-500"}`}>
              {isBalanced ? "✓ Debits equal Credits." : "⚠️ Debits and Credits do not tie out — this should not happen."}
            </p>

            <SignatoryBlock />
            <div data-pdf-spacer />
          </div>
        </ReportPreview>
      </div>
    </div>
  );
}
