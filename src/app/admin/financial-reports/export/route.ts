import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { buildWorkbookBuffer } from "@/lib/excel";
import { formatAed, formatDate } from "@/lib/format";
import { CORPORATE_TAX_RATE, CORPORATE_TAX_EXEMPT_THRESHOLD } from "@/lib/reportData";
import { suggestTaxPeriod, ADMIN_EXPENSE_LINES } from "@/lib/financialReportsCore";
import { computeIncomeStatement, computeRetainedEarnings } from "@/lib/financialReportsIncomeStatement";
import {
  computeBalanceSheet,
  computeAccountsPayable,
  getAccountsReceivableDetail,
  computeAssetDepreciation,
  computeShareholdersCurrentAccount,
} from "@/lib/financialReportsBalanceSheet";
import { computeCashFlowStatement, getGeneralLedger, getTrialBalance, CHART_OF_ACCOUNTS } from "@/lib/financialReportsLedger";
import { getPaymentTotals } from "@/lib/reportData";
import { buildCustomDateRange } from "@/lib/dateRangeFilter";

type Row = (string | number | null)[];

// Pads a row to the sheet's column count so summary/title rows never misalign
// against the primary table's headers, matching the convention already used
// in src/app/admin/reports/export/route.ts.
function pad(width: number, ...cells: (string | number | null)[]): Row {
  const row = [...cells];
  while (row.length < width) row.push(null);
  return row;
}

async function resolveRange(searchParams: URLSearchParams): Promise<{ from: Date; to: Date }> {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  if (fromParam && toParam) return { from: new Date(fromParam), to: new Date(toParam) };

  const setting = await prisma.setting.findUnique({
    where: { id: SETTING_ID },
    select: { taxRegistrationEffectiveDate: true, firstTaxPeriodEnd: true },
  });
  const suggested = suggestTaxPeriod(setting ?? { taxRegistrationEffectiveDate: null, firstTaxPeriodEnd: null });
  return { from: suggested?.from ?? new Date(new Date().getFullYear(), 0, 1), to: suggested?.to ?? new Date() };
}

function resolveAsOf(searchParams: URLSearchParams): Date {
  const asOf = searchParams.get("asOf");
  return asOf ? new Date(asOf) : new Date();
}

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");
  const searchParams = request.nextUrl.searchParams;
  const report = searchParams.get("report") ?? "";

  let headers: string[] = [];
  const rows: Row[] = [];
  let sheetName = "Financial Report";
  let fileName = "financial-report";

  switch (report) {
    case "balance-sheet": {
      const asOfDate = resolveAsOf(searchParams);
      const comparativeParam = searchParams.get("comparative");
      const comparativeDate = comparativeParam ? new Date(comparativeParam) : null;
      const { current, comparative } = await computeBalanceSheet({ asOfDate, comparativeDate });
      sheetName = "Balance Sheet";
      fileName = "statement-of-financial-position";
      headers = ["Line Item", `As at ${formatDate(current.asOfDate)}`, comparative ? `As at ${formatDate(comparative.asOfDate)}` : ""];
      const w = headers.length;
      const c2 = (v: number) => (comparative ? formatAed(v) : null);
      rows.push(pad(w, "ASSETS"));
      rows.push(pad(w, "Property, Plant and Equipment", formatAed(current.assets.nonCurrent.propertyPlantEquipment), comparative ? c2(comparative.assets.nonCurrent.propertyPlantEquipment) : null));
      rows.push(pad(w, "Cash and Cash Equivalents", formatAed(current.assets.current.cashAndCashEquivalents), comparative ? c2(comparative.assets.current.cashAndCashEquivalents) : null));
      rows.push(pad(w, "Accounts Receivable", formatAed(current.assets.current.accountsReceivable), comparative ? c2(comparative.assets.current.accountsReceivable) : null));
      rows.push(pad(w, "Advances, Deposits & Prepayments", formatAed(current.assets.current.advancesDepositsPrepayments), comparative ? c2(comparative.assets.current.advancesDepositsPrepayments) : null));
      rows.push(pad(w, "TOTAL ASSETS", formatAed(current.totalAssets), comparative ? c2(comparative.totalAssets) : null));
      rows.push(pad(w, null));
      rows.push(pad(w, "LIABILITIES"));
      rows.push(pad(w, "Bank Borrowings (Non-Current)", formatAed(current.liabilities.nonCurrent.bankBorrowings), comparative ? c2(comparative.liabilities.nonCurrent.bankBorrowings) : null));
      rows.push(pad(w, "Other Non-Current Liabilities", formatAed(current.liabilities.nonCurrent.otherNonCurrentLiabilities), comparative ? c2(comparative.liabilities.nonCurrent.otherNonCurrentLiabilities) : null));
      rows.push(pad(w, "Trade Accounts Payable", formatAed(current.liabilities.current.tradeAccountsPayable), comparative ? c2(comparative.liabilities.current.tradeAccountsPayable) : null));
      rows.push(pad(w, "Other Payables", formatAed(current.liabilities.current.otherPayables), comparative ? c2(comparative.liabilities.current.otherPayables) : null));
      rows.push(pad(w, "Bank Borrowings (Current)", formatAed(current.liabilities.current.bankBorrowings), comparative ? c2(comparative.liabilities.current.bankBorrowings) : null));
      rows.push(pad(w, null));
      rows.push(pad(w, "EQUITY"));
      rows.push(pad(w, "Share Capital", formatAed(current.equity.shareCapital), comparative ? c2(comparative.equity.shareCapital) : null));
      rows.push(pad(w, "Statutory Reserves", formatAed(current.equity.statutoryReserves), comparative ? c2(comparative.equity.statutoryReserves) : null));
      rows.push(pad(w, "Retained Earnings", formatAed(current.equity.retainedEarnings), comparative ? c2(comparative.equity.retainedEarnings) : null));
      rows.push(pad(w, "Shareholder's Current Account", formatAed(current.equity.shareholdersCurrentAccount), comparative ? c2(comparative.equity.shareholdersCurrentAccount) : null));
      rows.push(pad(w, "TOTAL EQUITY AND LIABILITIES", formatAed(current.totalLiabilitiesAndEquity), comparative ? c2(comparative.totalLiabilitiesAndEquity) : null));
      rows.push(pad(w, null));
      rows.push(pad(w, "Difference", formatAed(current.difference)));
      rows.push(pad(w, "Is Balanced", current.isBalanced ? "Yes" : "No"));
      break;
    }

    case "income-statement": {
      const { from, to } = await resolveRange(searchParams);
      const statement = await computeIncomeStatement({ from, to });
      sheetName = "Income Statement";
      fileName = "statement-of-comprehensive-income";
      headers = ["Line Item", `${formatDate(from)} — ${formatDate(to)}`];
      const w = headers.length;
      rows.push(pad(w, "REVENUE"));
      rows.push(pad(w, "Service Revenue", formatAed(statement.revenue.serviceRevenue)));
      rows.push(pad(w, "Other Revenue", formatAed(statement.revenue.otherRevenue)));
      rows.push(pad(w, "TOTAL REVENUE", formatAed(statement.revenue.total)));
      rows.push(pad(w, "Cost of Sales / Direct Costs", formatAed(statement.costOfSales)));
      rows.push(pad(w, "GROSS PROFIT / (LOSS)", formatAed(statement.grossProfit)));
      rows.push(pad(w, null));
      rows.push(pad(w, "ADMINISTRATIVE AND GENERAL EXPENSES"));
      for (const line of statement.adminExpenses) rows.push(pad(w, line.label, formatAed(line.amount)));
      rows.push(pad(w, "TOTAL ADMINISTRATIVE AND GENERAL EXPENSES", formatAed(statement.totalAdminExpenses)));
      rows.push(pad(w, "PROFIT / (LOSS) BEFORE TAX", formatAed(statement.profitBeforeTax)));
      rows.push(pad(w, "Corporate Tax Expense", formatAed(statement.corporateTaxExpense)));
      rows.push(pad(w, "PROFIT / (LOSS) FOR THE PERIOD", formatAed(statement.profitForPeriod)));
      break;
    }

    case "cash-flow": {
      const { from, to } = await resolveRange(searchParams);
      const cashFlow = await computeCashFlowStatement({ from, to });
      sheetName = "Cash Flow";
      fileName = "cash-flow-statement";
      headers = ["Line Item", `${formatDate(from)} — ${formatDate(to)}`];
      const w = headers.length;
      rows.push(pad(w, "Opening Cash & Cash Equivalents", formatAed(cashFlow.openingCash)));
      rows.push(pad(w, "Net Cash from Operating Activities", formatAed(cashFlow.operating)));
      rows.push(pad(w, "Net Cash from Investing Activities", formatAed(cashFlow.investing)));
      rows.push(pad(w, "Net Cash from Financing Activities", formatAed(cashFlow.financing)));
      rows.push(pad(w, "Net Change in Cash", formatAed(cashFlow.netChange)));
      rows.push(pad(w, "Closing Cash & Cash Equivalents", formatAed(cashFlow.closingCash)));
      break;
    }

    case "accounts-receivable": {
      const asOfDate = resolveAsOf(searchParams);
      const { rows: arRows, total } = await getAccountsReceivableDetail(asOfDate);
      sheetName = "Accounts Receivable";
      fileName = "accounts-receivable";
      headers = ["Invoice #", "Date", "Customer", "Amount"];
      const w = headers.length;
      for (const r of arRows) rows.push(pad(w, r.number, formatDate(r.date), r.customerName, formatAed(r.amount)));
      rows.push(pad(w, "TOTAL", null, null, formatAed(total)));
      break;
    }

    case "accounts-payable": {
      const asOfDate = resolveAsOf(searchParams);
      sheetName = "Accounts Payable";
      fileName = "accounts-payable";
      headers = ["Line Item", `As at ${formatDate(asOfDate)}`];
      const w = headers.length;
      rows.push(pad(w, "Total Accounts Payable", formatAed(computeAccountsPayable())));
      rows.push(pad(w, "Note", "No outstanding vendor bills — expenses are always recorded as already paid."));
      break;
    }

    case "general-ledger": {
      const { from, to } = await resolveRange(searchParams);
      const accountParam = searchParams.get("account");
      const account = (CHART_OF_ACCOUNTS as readonly string[]).includes(accountParam ?? "") ? (accountParam as (typeof CHART_OF_ACCOUNTS)[number]) : "Cash";
      const ledgerRows = await getGeneralLedger({ account, from, to });
      sheetName = `GL — ${account}`;
      fileName = `general-ledger-${account.toLowerCase().replace(/\s+/g, "-")}`;
      headers = ["Date", "Description", "Debit", "Credit", "Balance"];
      const w = headers.length;
      let runningBalance = 0;
      for (const r of ledgerRows) {
        runningBalance += r.debit - r.credit;
        rows.push(pad(w, formatDate(r.date), r.description, r.debit ? formatAed(r.debit) : null, r.credit ? formatAed(r.credit) : null, formatAed(runningBalance)));
      }
      rows.push(pad(w, "TOTAL", null, formatAed(ledgerRows.reduce((s, r) => s + r.debit, 0)), formatAed(ledgerRows.reduce((s, r) => s + r.credit, 0)), formatAed(runningBalance)));
      break;
    }

    case "trial-balance": {
      const { from, to } = await resolveRange(searchParams);
      const { rows: tbRows, totalDebit, totalCredit } = await getTrialBalance({ from, to });
      sheetName = "Trial Balance";
      fileName = "trial-balance";
      headers = ["Account", "Debit", "Credit"];
      const w = headers.length;
      for (const r of tbRows) rows.push(pad(w, r.account, r.debit ? formatAed(r.debit) : null, r.credit ? formatAed(r.credit) : null));
      rows.push(pad(w, "TOTAL", formatAed(totalDebit), formatAed(totalCredit)));
      break;
    }

    case "expense-report": {
      const range = await resolveRange(searchParams);
      sheetName = "Expense Report";
      fileName = "expense-report";
      headers = ["Category", `${formatDate(range.from)} — ${formatDate(range.to)}`];
      const w = headers.length;
      let total = 0;
      for (const line of ADMIN_EXPENSE_LINES) {
        const amount = await line.compute(range);
        total += amount;
        rows.push(pad(w, line.label, formatAed(amount)));
      }
      rows.push(pad(w, "TOTAL EXPENSES", formatAed(total)));
      break;
    }

    case "revenue-report": {
      const { from, to } = await resolveRange(searchParams);
      const [statement, paymentTotals] = await Promise.all([
        computeIncomeStatement({ from, to }),
        getPaymentTotals({ date: buildCustomDateRange(from, to) }),
      ]);
      sheetName = "Revenue Report";
      fileName = "revenue-report";
      headers = ["Line Item", `${formatDate(from)} — ${formatDate(to)}`];
      const w = headers.length;
      rows.push(pad(w, "Service Revenue", formatAed(statement.revenue.serviceRevenue)));
      rows.push(pad(w, "Other Revenue", formatAed(statement.revenue.otherRevenue)));
      rows.push(pad(w, "TOTAL REVENUE", formatAed(statement.revenue.total)));
      rows.push(pad(w, null));
      rows.push(pad(w, "Paid Revenue by Payment Method"));
      rows.push(pad(w, "Cash", formatAed(paymentTotals.cash)));
      rows.push(pad(w, "Ziina", formatAed(paymentTotals.ziina)));
      rows.push(pad(w, "Bank Transfer", formatAed(paymentTotals.bankTransfer)));
      break;
    }

    case "asset-report": {
      const asOfDate = resolveAsOf(searchParams);
      const assets = await prisma.asset.findMany({ where: { purchaseDate: { lte: asOfDate } }, orderBy: { purchaseDate: "asc" } });
      sheetName = "Asset Report";
      fileName = "asset-report";
      headers = ["Asset", "Purchased", "Cost", "Accum. Depreciation", "Net Book Value"];
      const w = headers.length;
      let totalCost = 0;
      let totalDep = 0;
      let totalNbv = 0;
      for (const a of assets) {
        const { accumulatedDepreciation, netBookValue } = computeAssetDepreciation(a, asOfDate);
        totalCost += a.purchaseCost;
        totalDep += accumulatedDepreciation;
        totalNbv += netBookValue;
        rows.push(pad(w, a.name, formatDate(a.purchaseDate), formatAed(a.purchaseCost), formatAed(accumulatedDepreciation), formatAed(netBookValue)));
      }
      rows.push(pad(w, "TOTAL", null, formatAed(totalCost), formatAed(totalDep), formatAed(totalNbv)));
      break;
    }

    case "liability-report": {
      const asOfDate = resolveAsOf(searchParams);
      const liabilities = await prisma.liability.findMany({ where: { createdAt: { lte: asOfDate } }, orderBy: { createdAt: "asc" } });
      sheetName = "Liability Report";
      fileName = "liability-report";
      headers = ["Liability", "Type", "Category", "Amount"];
      const w = headers.length;
      let total = 0;
      for (const l of liabilities) {
        total += l.amount;
        rows.push(pad(w, l.name, l.type, l.category, formatAed(l.amount)));
      }
      rows.push(pad(w, "TOTAL LIABILITIES", null, null, formatAed(total)));
      break;
    }

    case "equity-report": {
      const asOfDate = resolveAsOf(searchParams);
      const setting = await prisma.setting.findUnique({
        where: { id: SETTING_ID },
        select: { shareCapital: true, statutoryReserves: true, shareholderEmployeeId: true },
      });
      const [retainedEarnings, shareholdersCurrentAccount] = await Promise.all([
        computeRetainedEarnings(asOfDate),
        computeShareholdersCurrentAccount(asOfDate, setting?.shareholderEmployeeId ?? null),
      ]);
      const shareCapital = setting?.shareCapital ?? 0;
      const statutoryReserves = setting?.statutoryReserves ?? 0;
      sheetName = "Equity Report";
      fileName = "equity-report";
      headers = ["Equity Component", `As at ${formatDate(asOfDate)}`];
      const w = headers.length;
      rows.push(pad(w, "Share Capital", formatAed(shareCapital)));
      rows.push(pad(w, "Statutory Reserves", formatAed(statutoryReserves)));
      rows.push(pad(w, "Retained Earnings", formatAed(retainedEarnings)));
      rows.push(pad(w, "Shareholder's Current Account", formatAed(shareholdersCurrentAccount)));
      rows.push(pad(w, "TOTAL EQUITY", formatAed(shareCapital + statutoryReserves + retainedEarnings + shareholdersCurrentAccount)));
      break;
    }

    case "tax-reports": {
      const { from, to } = await resolveRange(searchParams);
      const [statement, setting] = await Promise.all([
        computeIncomeStatement({ from, to }),
        prisma.setting.findUnique({
          where: { id: SETTING_ID },
          select: {
            taxRegistrationNumber: true,
            taxRegistrationEffectiveDate: true,
            taxCertificateIssueDate: true,
            firstTaxPeriodStart: true,
            firstTaxPeriodEnd: true,
            firstTaxReturnFilingDueDate: true,
          },
        }),
      ]);
      sheetName = "Tax Report";
      fileName = "tax-report";
      headers = ["Item", "Value"];
      const w = headers.length;
      rows.push(pad(w, "Tax Registration Number", setting?.taxRegistrationNumber ?? "—"));
      rows.push(pad(w, "Tax Registration Effective Date", setting?.taxRegistrationEffectiveDate ? formatDate(setting.taxRegistrationEffectiveDate) : "—"));
      rows.push(pad(w, "Certificate Issue Date", setting?.taxCertificateIssueDate ? formatDate(setting.taxCertificateIssueDate) : "—"));
      rows.push(pad(w, "First Tax Period Start", setting?.firstTaxPeriodStart ? formatDate(setting.firstTaxPeriodStart) : "—"));
      rows.push(pad(w, "First Tax Period End", setting?.firstTaxPeriodEnd ? formatDate(setting.firstTaxPeriodEnd) : "—"));
      rows.push(pad(w, "First Tax Return Filing Due Date", setting?.firstTaxReturnFilingDueDate ? formatDate(setting.firstTaxReturnFilingDueDate) : "—"));
      rows.push(pad(w, null));
      rows.push(pad(w, `Period: ${formatDate(from)} — ${formatDate(to)}`));
      rows.push(pad(w, "Profit Before Tax", formatAed(statement.profitBeforeTax)));
      rows.push(pad(w, "Tax-Exempt Threshold", formatAed(CORPORATE_TAX_EXEMPT_THRESHOLD)));
      rows.push(pad(w, "Corporate Tax Rate", `${(CORPORATE_TAX_RATE * 100).toFixed(0)}%`));
      rows.push(pad(w, "Corporate Tax Expense", formatAed(statement.corporateTaxExpense)));
      rows.push(pad(w, "Profit For The Period (After Tax)", formatAed(statement.profitForPeriod)));
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 400 });
  }

  const buffer = await buildWorkbookBuffer(sheetName, headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
    },
  });
}
