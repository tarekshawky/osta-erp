import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { buildDateRange } from "@/lib/dateRangeFilter";
import { formatDate } from "@/lib/format";
import type { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const year = request.nextUrl.searchParams.get("year");
  const month = request.nextUrl.searchParams.get("month");
  const team = request.nextUrl.searchParams.get("team");
  const where: Prisma.ExpenseWhereInput = {};
  const dateRange = buildDateRange(year ? Number(year) : null, month ? Number(month) : null);
  if (dateRange) where.date = dateRange;
  if (team && team !== "all") where.team = { name: team };

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { createdBy: true, team: true },
  });

  const headers = [
    "Date",
    "Category",
    "Vehicle",
    "Subcategory",
    "Description",
    "Payment",
    "Amount",
    "Employee",
    "Team",
    "Status",
  ];

  const rows = expenses.map((exp) => [
    formatDate(exp.date),
    exp.category ?? "",
    exp.vehicle ?? "",
    exp.subcategory ?? "",
    exp.description,
    exp.payment,
    exp.amount,
    exp.createdBy.name,
    exp.team?.name ?? "",
    exp.status,
  ]);

  const buffer = await buildWorkbookBuffer("Expenses", headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="expenses-export.xlsx"`,
    },
  });
}
