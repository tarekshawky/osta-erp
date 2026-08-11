import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";

export async function GET() {
  await requireEmployee("ADMIN");

  const headers = [
    "Customer Name",
    "Phone",
    "WhatsApp",
    "Email",
    "Language",
    "Emirate",
    "City",
    "Area",
    "Building Type",
    "Building Name",
    "Flat No",
    "Notes",
  ];

  const sampleRow = [
    "Ahmed Al Mansoori",
    "501234567",
    "",
    "",
    "Arabic",
    "Dubai",
    "",
    "",
    "",
    "Marina Tower",
    "1204",
    "",
  ];

  const buffer = await buildWorkbookBuffer("Customers Template", headers, [sampleRow]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="customers-import-template.xlsx"`,
    },
  });
}
