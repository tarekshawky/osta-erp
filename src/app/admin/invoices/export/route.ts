import { NextRequest, NextResponse } from "next/server";
import { invoiceStatusFilter } from "@/lib/invoiceCollections";
import { collectionOf } from "@/lib/invoicePayment";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { buildDateRange } from "@/lib/dateRangeFilter";
import { formatDate } from "@/lib/format";
import type { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") ?? "";
  const team = searchParams.get("team") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : null;
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : null;

  const where: Prisma.InvoiceWhereInput = {};
  if (q) {
    where.OR = [
      { customer: { name: { contains: q } } },
      { customer: { companyName: { contains: q } } },
      { number: { contains: q } },
    ];
  }
  if (team !== "all") where.team = { name: team };
  Object.assign(where, invoiceStatusFilter(status));
  const dateRange = buildDateRange(year, month);
  if (dateRange) where.date = dateRange;

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
    "Payment Status",
    "Payment Date",
    "Paid Amount",
    "Remaining Balance",
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
    collectionOf(inv).state,
    collectionOf(inv).paymentDate ? formatDate(collectionOf(inv).paymentDate as Date) : "",
    collectionOf(inv).received,
    collectionOf(inv).remaining,
  ]);

  const buffer = await buildWorkbookBuffer("Invoices", headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="invoices-export.xlsx"`,
    },
  });
}
