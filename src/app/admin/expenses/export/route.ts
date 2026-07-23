import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { formatDate } from "@/lib/format";
import type { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const year = request.nextUrl.searchParams.get("year");
  const where: Prisma.ExpenseWhereInput = {};
  if (year) {
    const y = Number(year);
    where.date = { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { createdBy: true, team: true },
  });

  const headers = ["Date", "Category", "Description", "Payment", "Amount", "Employee", "Team", "Status"];

  const rows = expenses.map((exp) => [
    formatDate(exp.date),
    exp.category ?? "",
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
