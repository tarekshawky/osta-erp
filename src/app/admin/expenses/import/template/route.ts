import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel";

export async function GET() {
  await requireEmployee("ADMIN");

  const headers = ["Date", "Category", "Vehicle", "Subcategory", "Shop Name", "Description", "Payment", "Amount"];
  const sampleRow = [
    new Date().toISOString().slice(0, 10),
    "Vehicle",
    "Toyota Camry",
    "Fuel",
    "Adnoc",
    "Fuel refill",
    "Cash",
    150,
  ];

  const buffer = await buildWorkbookBuffer("Expenses Template", headers, [sampleRow]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="expenses-import-template.xlsx"`,
    },
  });
}
