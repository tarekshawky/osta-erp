import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";

export async function GET() {
  await requireEmployee("ADMIN");

  const headers = [
    "Customer Name",
    "Customer Type",
    "Phone",
    "Emirate",
    "Building Name",
    "Flat No",
    "Team",
    "Category",
    "Service Type",
    "Service",
    "Qty",
    "Unit Price",
    "Payment",
    "Date",
  ];

  const sampleRow = [
    "Ahmed Al Mansoori",
    "Individual",
    "501234567",
    "Dubai",
    "Marina Tower",
    "1204",
    "Ajman",
    "AC",
    "Repair",
    "AC Cleaning",
    1,
    250,
    "Cash",
    new Date().toISOString().slice(0, 10),
  ];

  const buffer = await buildWorkbookBuffer("Invoices Template", headers, [sampleRow]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="invoices-import-template.xlsx"`,
    },
  });
}
