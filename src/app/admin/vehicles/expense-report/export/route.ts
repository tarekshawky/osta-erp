import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { formatAed } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/reportData";
import {
  computeVehicleExpenseReportSummary,
  computeFineReportSummary,
  computeMileageReportSummary,
  computeFuelReportSummary,
} from "@/lib/vehicleData";

type Row = (string | number | null)[];

function pad(width: number, ...cells: (string | number | null)[]): Row {
  const row = [...cells];
  while (row.length < width) row.push(null);
  return row;
}

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const searchParams = request.nextUrl.searchParams;
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;
  const periodLabel = year ? (month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year)) : "All Time";

  const [summary, fineSummary, mileageSummary, fuelSummary] = await Promise.all([
    computeVehicleExpenseReportSummary({ year, month }),
    computeFineReportSummary({ year, month }),
    computeMileageReportSummary(),
    computeFuelReportSummary({ year, month }),
  ]);

  const headers = ["Item", "Value"];
  const w = headers.length;
  const rows: Row[] = [];

  rows.push(pad(w, `Vehicle Expense Report — ${periodLabel}`));
  rows.push(pad(w, "Total Vehicle Expenses", formatAed(summary.total)));
  for (const [type, amount] of Object.entries(summary.bySubcategory)) {
    rows.push(pad(w, type, formatAed(amount)));
  }

  rows.push(pad(w, null));
  rows.push(pad(w, `Fine Report — ${periodLabel}`));
  rows.push(pad(w, "Total Fines", formatAed(fineSummary.totalFines)));
  rows.push(pad(w, "Company Contribution", formatAed(fineSummary.totalCompany)));
  rows.push(pad(w, "Employee Responsibility", formatAed(fineSummary.totalEmployee)));
  rows.push(pad(w, "Amount Deducted", formatAed(fineSummary.deducted)));
  rows.push(pad(w, "Remaining", formatAed(fineSummary.remaining)));
  for (const [name, amount] of Object.entries(fineSummary.byVehicle)) {
    rows.push(pad(w, `Fines by Vehicle — ${name}`, formatAed(amount)));
  }
  for (const [name, amount] of Object.entries(fineSummary.byEmployee)) {
    rows.push(pad(w, `Fines by Employee — ${name}`, formatAed(amount)));
  }

  rows.push(pad(w, null));
  rows.push(pad(w, "Mileage Report"));
  rows.push(pad(w, "Vehicle", "Current / Last Service / Next Service Odometer"));
  for (const v of mileageSummary) {
    rows.push(
      pad(
        w,
        v.vehicleName,
        `${v.currentOdometer.toLocaleString()} KM / ${v.lastServiceOdometer != null ? `${v.lastServiceOdometer.toLocaleString()} KM` : "—"} / ${v.nextServiceOdometer != null ? `${v.nextServiceOdometer.toLocaleString()} KM` : "—"}`
      )
    );
  }

  rows.push(pad(w, null));
  rows.push(pad(w, `Fuel Report — ${periodLabel}`));
  rows.push(pad(w, "Total Fuel Cost", formatAed(fuelSummary.totalCost)));
  rows.push(pad(w, "Total Liters", `${fuelSummary.totalLiters.toLocaleString()} L`));
  rows.push(pad(w, "Avg KM/L", fuelSummary.avgKmPerLiter != null ? fuelSummary.avgKmPerLiter.toFixed(2) : "—"));
  rows.push(pad(w, "Avg Cost/KM", fuelSummary.avgCostPerKm != null ? formatAed(fuelSummary.avgCostPerKm) : "—"));

  const buffer = await buildWorkbookBuffer("Vehicle Expense Report", headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vehicle-expense-report${year ? `-${year}` : ""}${month ? `-${String(month).padStart(2, "0")}` : ""}.xlsx"`,
    },
  });
}
