import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { getGeneralLedger, CHART_OF_ACCOUNTS } from "@/lib/financialReportsLedger";
import { suggestTaxPeriod, formatPeriodTitle } from "@/lib/financialReportsCore";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { AccountPicker } from "@/components/financial-reports/AccountPicker";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; account?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { from: fromParam, to: toParam, account: accountParam } = await searchParams;

  const account = (CHART_OF_ACCOUNTS as readonly string[]).includes(accountParam ?? "") ? (accountParam as (typeof CHART_OF_ACCOUNTS)[number]) : "Cash";

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

  const rows = await getGeneralLedger({ account, from, to });

  const rowsWithBalance = rows.reduce<(typeof rows[number] & { balance: number })[]>((acc, r) => {
    const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    acc.push({ ...r, balance: previousBalance + r.debit - r.credit });
    return acc;
  }, []);
  const runningBalance = rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].balance : 0;

  const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="pb-10">
      <AdminTopBar title="General Ledger" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">General Ledger</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          A computed projection over existing Invoice/Expense/Payroll/Credit Card data — not a formal double-entry
          ledger.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <AccountPicker account={account} />
        </div>
        <div className="mt-3">
          <DateRangeFilter from={toDateInputValue(from)} to={toDateInputValue(to)} />
        </div>

        <div className="mb-4">
          <ReportActions targetId="general-ledger-preview" fileName={`general-ledger-${account.toLowerCase().replace(/\s+/g, "-")}`} />
        </div>

        <ReportPreview id="general-ledger-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">GENERAL LEDGER — {account.toUpperCase()}</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatPeriodTitle(from, to)}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Description</th>
                  <th className="py-1.5 font-medium text-right">Debit</th>
                  <th className="py-1.5 font-medium text-right">Credit</th>
                  <th className="py-1.5 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithBalance.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5">{formatDate(r.date)}</td>
                    <td className="py-1.5">{r.description}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.debit ? formatAed(r.debit) : ""}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.credit ? formatAed(r.credit) : ""}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAed(r.balance)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No transactions for this account in this period.
                    </td>
                  </tr>
                )}
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(totalDebit)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(totalCredit)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(runningBalance)}</td>
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
