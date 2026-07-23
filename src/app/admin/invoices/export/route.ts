import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { formatDate } from "@/lib/format";
import type { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") ?? "";
  const team = searchParams.get("team") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : null;

  const where: Prisma.InvoiceWhereInput = {};
  if (q) {
    where.OR = [
      { customer: { name: { contains: q } } },
      { customer: { companyName: { contains: q } } },
      { number: { contains: q } },
    ];
  }
  if (team !== "all") where.team = { name: team };
  if (status !== "all") where.status = status;
  if (year) where.date = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { date: "desc" },
    include: { team: true, createdBy: true, customer: true, items: true },
  });

  const headers = [
    "Invoice #",
    "Date",
    "Customer Name",
    "Customer Type",
    "Phone",
    "Emirate",
    "Team",
    "Created By",
    "Category",
    "Service Type",
    "Service",
    "Payment",
    "Amount",
    "Status",
  ];

  const rows = invoices.map((inv) => [
    inv.number,
    formatDate(inv.date),
    inv.customer.type === "COMPANY" ? inv.customer.companyName ?? inv.customer.name : inv.customer.name,
    inv.customer.type,
    inv.customer.phone,
    inv.customer.emirate,
    inv.team?.name ?? "",
    inv.createdBy.name,
    inv.category,
    inv.serviceType,
    inv.items.map((it) => it.serviceName).join(", "),
    inv.payment,
    inv.amount,
    inv.status,
  ]);

  const buffer = await buildWorkbookBuffer("Invoices", headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="invoices-export.xlsx"`,
    },
  });
}
