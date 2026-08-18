import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { computeAnnualReport, summarize, MONTH_NAMES } from "@/lib/reportData";
import { formatAed } from "@/lib/format";
import {
  computeVehicleExpenseReportSummary,
  computeFineReportSummary,
  computeMileageReportSummary,
  computeFuelReportSummary,
} from "@/lib/vehicleData";

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const searchParams = request.nextUrl.searchParams;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const monthParam = searchParams.get("month");
  const month = monthParam ? Number(monthParam) : null;
  const team = searchParams.get("team") ?? "all";

  const { months } = await computeAnnualReport(year, team);

  const headers = [
    "Month",
    "Revenue (AED)",
    "Salary (AED)",
    "Cost of Services (AED)",
    "Gross Profit (AED)",
    "All Expenses (AED)",
    "Net Profit (AED)",
  ];

  const rows: (string | number | null)[][] = months.map((m, i) => {
    const costOfServices = m.costOfServiceExpenses + m.salaries;
    const grossProfit = m.revenue - costOfServices;
    const netProfit = grossProfit - m.operatingExpenses;
    return [
      MONTH_NAMES[i],
      Number(m.revenue.toFixed(2)),
      Number(m.salaries.toFixed(2)),
      Number(costOfServices.toFixed(2)),
      Number(grossProfit.toFixed(2)),
      Number(m.operatingExpenses.toFixed(2)),
      Number(netProfit.toFixed(2)),
    ];
  });

  const selectedMonths = month ? [months[month - 1]] : months;
  const {
    totalRevenue,
    totalSalaries,
    totalCash,
    totalZiina,
    totalBankTransfer,
    costOfServices,
    grossProfit,
    operatingExpenses,
    netProfitBeforeTax,
    taxableProfit,
    corporateTax,
    netProfitAfterTax,
  } = summarize(selectedMonths);
  const paymentTotals = { cash: totalCash, ziina: totalZiina, bankTransfer: totalBankTransfer };

  const periodLabel = month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year);

  rows.push([null, null, null, null, null, null, null]);
  rows.push([
    `Financial Summary — ${periodLabel}${team !== "all" ? ` (${team})` : ""}`,
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  rows.push(["Total Revenue", formatAed(totalRevenue), null, null, null, null, null]);
  rows.push(["Salary", formatAed(totalSalaries), null, null, null, null, null]);
  rows.push(["Total Cost (Cost of Services)", formatAed(costOfServices), null, null, null, null, null]);
  rows.push(["Gross Profit", formatAed(grossProfit), null, null, null, null, null]);
  rows.push(["All Expenses", formatAed(operatingExpenses), null, null, null, null, null]);
  rows.push(["Net Profit Before Tax", formatAed(netProfitBeforeTax), null, null, null, null, null]);
  rows.push(["Taxable Profit", formatAed(taxableProfit), null, null, null, null, null]);
  rows.push(["Corporate Tax", formatAed(corporateTax), null, null, null, null, null]);
  rows.push(["Net Profit After Tax", formatAed(netProfitAfterTax), null, null, null, null, null]);
  rows.push([null, null, null, null, null, null, null]);
  rows.push([`Revenue by Payment Method — ${periodLabel}`, null, null, null, null, null, null]);
  rows.push(["Cash", formatAed(paymentTotals.cash), null, null, null, null, null]);
  rows.push(["Ziina", formatAed(paymentTotals.ziina), null, null, null, null, null]);
  rows.push(["Bank Transfer", formatAed(paymentTotals.bankTransfer), null, null, null, null, null]);

  const [vehicleExpenseSummary, fineSummary, mileageSummary, fuelSummary] = await Promise.all([
    computeVehicleExpenseReportSummary({ year, month }),
    computeFineReportSummary({ year, month }),
    computeMileageReportSummary(),
    computeFuelReportSummary({ year, month }),
  ]);

  rows.push([null, null, null, null, null, null, null]);
  rows.push([`Vehicle Expense Report — ${periodLabel}`, null, null, null, null, null, null]);
  rows.push(["Total Vehicle Expenses", formatAed(vehicleExpenseSummary.total), null, null, null, null, null]);
  for (const [type, amount] of Object.entries(vehicleExpenseSummary.bySubcategory)) {
    rows.push([type, formatAed(amount), null, null, null, null, null]);
  }

  rows.push([null, null, null, null, null, null, null]);
  rows.push([`Fine Report — ${periodLabel}`, null, null, null, null, null, null]);
  rows.push(["Total Fines", formatAed(fineSummary.totalFines), null, null, null, null, null]);
  rows.push(["Company Contribution", formatAed(fineSummary.totalCompany), null, null, null, null, null]);
  rows.push(["Employee Responsibility", formatAed(fineSummary.totalEmployee), null, null, null, null, null]);
  rows.push(["Amount Deducted", formatAed(fineSummary.deducted), null, null, null, null, null]);
  rows.push(["Remaining", formatAed(fineSummary.remaining), null, null, null, null, null]);
  for (const [name, amount] of Object.entries(fineSummary.byVehicle)) {
    rows.push([`Fines by Vehicle — ${name}`, formatAed(amount), null, null, null, null, null]);
  }
  for (const [name, amount] of Object.entries(fineSummary.byEmployee)) {
    rows.push([`Fines by Employee — ${name}`, formatAed(amount), null, null, null, null, null]);
  }

  rows.push([null, null, null, null, null, null, null]);
  rows.push(["Mileage Report", null, null, null, null, null, null]);
  rows.push(["Vehicle", "Current Odometer", "Last Service Odometer", "Next Service Odometer", null, null, null]);
  for (const v of mileageSummary) {
    rows.push([
      v.vehicleName,
      `${v.currentOdometer.toLocaleString()} KM`,
      v.lastServiceOdometer != null ? `${v.lastServiceOdometer.toLocaleString()} KM` : "—",
      v.nextServiceOdometer != null ? `${v.nextServiceOdometer.toLocaleString()} KM` : "—",
      null,
      null,
      null,
    ]);
  }

  rows.push([null, null, null, null, null, null, null]);
  rows.push([`Fuel Report — ${periodLabel}`, null, null, null, null, null, null]);
  rows.push(["Total Fuel Cost", formatAed(fuelSummary.totalCost), null, null, null, null, null]);
  rows.push(["Total Liters", `${fuelSummary.totalLiters.toLocaleString()} L`, null, null, null, null, null]);
  rows.push(["Avg KM/L", fuelSummary.avgKmPerLiter != null ? fuelSummary.avgKmPerLiter.toFixed(2) : "—", null, null, null, null, null]);
  rows.push(["Avg Cost/KM", fuelSummary.avgCostPerKm != null ? formatAed(fuelSummary.avgCostPerKm) : "—", null, null, null, null, null]);

  const buffer = await buildWorkbookBuffer("Financial Report", headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="financial-report-${year}${month ? `-${String(month).padStart(2, "0")}` : ""}.xlsx"`,
    },
  });
}
