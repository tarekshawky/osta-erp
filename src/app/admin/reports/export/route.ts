import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { computeAnnualReport, summarize, MONTH_NAMES } from "@/lib/reportData";
import { formatAed } from "@/lib/format";

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const searchParams = request.nextUrl.searchParams;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const monthParam = searchParams.get("month");
  const month = monthParam ? Number(monthParam) : null;
  const team = searchParams.get("team") ?? "all";

  const { months } = await computeAnnualReport(year, team);

  const headers = ["Month", "Revenue (AED)", "Expenses (AED)", "Salaries (AED)", "Net Profit (AED)"];

  const rows: (string | number | null)[][] = months.map((m, i) => [
    MONTH_NAMES[i],
    Number(m.revenue.toFixed(2)),
    Number(m.expenses.toFixed(2)),
    Number(m.salaries.toFixed(2)),
    Number((m.revenue - m.expenses - m.salaries).toFixed(2)),
  ]);

  const selectedMonths = month ? [months[month - 1]] : months;
  const { totalRevenue, totalExpenses, totalSalaries, netProfitBeforeTax, taxableProfit, corporateTax, netProfitAfterTax } =
    summarize(selectedMonths);

  const periodLabel = month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year);

  rows.push([null, null, null, null, null]);
  rows.push([`Summary — ${periodLabel}${team !== "all" ? ` (${team})` : ""}`, null, null, null, null]);
  rows.push(["Total Revenue", formatAed(totalRevenue), null, null, null]);
  rows.push(["Total Expenses", formatAed(totalExpenses), null, null, null]);
  rows.push(["Total Salaries", formatAed(totalSalaries), null, null, null]);
  rows.push(["Net Profit (Before Tax)", formatAed(netProfitBeforeTax), null, null, null]);
  rows.push(["Taxable Profit", formatAed(taxableProfit), null, null, null]);
  rows.push(["Corporate Tax", formatAed(corporateTax), null, null, null]);
  rows.push(["Net Profit (After Tax)", formatAed(netProfitAfterTax), null, null, null]);

  const buffer = await buildWorkbookBuffer("Annual Report", headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report-${year}${month ? `-${String(month).padStart(2, "0")}` : ""}.xlsx"`,
    },
  });
}
