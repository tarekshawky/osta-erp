import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";
import { formatDate } from "@/lib/format";
import { getCustomersFinancialMap, getFinancialsFor, matchesActivityFilter, CUSTOMER_ACTIVITY_FILTERS, type CustomerActivityFilter } from "@/lib/customerData";
import type { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  await requireEmployee("ADMIN");

  const searchParams = request.nextUrl.searchParams;
  const all = searchParams.get("all") === "1";
  const q = searchParams.get("q") ?? "";
  const emirate = searchParams.get("emirate") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const activityParam = searchParams.get("activity") ?? "All Customers";
  const activity = (CUSTOMER_ACTIVITY_FILTERS as readonly string[]).includes(activityParam)
    ? (activityParam as CustomerActivityFilter)
    : "All Customers";

  const where: Prisma.CustomerWhereInput = {};
  if (!all) {
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { whatsapp: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { orders: { some: { number: { contains: q, mode: "insensitive" } } } },
        { invoices: { some: { number: { contains: q, mode: "insensitive" } } } },
        { quotations: { some: { number: { contains: q, mode: "insensitive" } } } },
      ];
    }
    if (emirate !== "all") where.emirate = emirate;
    if (status !== "all") where.status = status;
  }

  const customers = await prisma.customer.findMany({ where, orderBy: { createdAt: "desc" } });
  const financialsMap = await getCustomersFinancialMap(customers.map((c) => c.id));
  const filtered = all ? customers : customers.filter((c) => matchesActivityFilter(activity, c, getFinancialsFor(financialsMap, c.id)));

  const headers = [
    "Customer ID",
    "Customer Name",
    "Phone",
    "WhatsApp",
    "Email",
    "Language",
    "Emirate",
    "City",
    "Area",
    "Building Type",
    "Full Address",
    "Google Maps Link",
    "Customer Status",
    "Number of Orders",
    "Completed Orders",
    "Number of Invoices",
    "Total Revenue",
    "Paid Amount",
    "Outstanding Amount",
    "Last Order Date",
    "Last Invoice Date",
    "Created Date",
    "Last Updated Date",
  ];

  const rows = filtered.map((c) => {
    const f = getFinancialsFor(financialsMap, c.id);
    const fullAddress = c.address || [c.buildingName, c.flatNo, c.area, c.city, c.emirate].filter(Boolean).join(", ");
    return [
      c.code,
      c.type === "COMPANY" ? c.companyName || c.name : c.name,
      c.phone,
      c.whatsapp ?? "",
      c.email ?? "",
      c.language,
      c.emirate,
      c.city ?? "",
      c.area ?? "",
      c.buildingType ?? "",
      fullAddress,
      c.locationUrl ?? "",
      c.status,
      f.totalOrders,
      f.completedOrders,
      f.invoiceCount,
      f.totalRevenue,
      f.paidAmount,
      f.outstandingAmount,
      f.lastOrderDate ? formatDate(f.lastOrderDate) : "",
      f.lastInvoiceDate ? formatDate(f.lastInvoiceDate) : "",
      formatDate(c.createdAt),
      formatDate(c.updatedAt),
    ];
  });

  const buffer = await buildWorkbookBuffer("Customers", headers, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="customers-export.xlsx"`,
    },
  });
}
