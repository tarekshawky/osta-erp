"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { parseWorkbookRows, type ImportResult } from "@/lib/excel";
import { generateCustomerCode } from "@/lib/customerData";
import { CUSTOMER_LANGUAGES } from "@/lib/orderData";

export async function importCustomersFromExcel(formData: FormData): Promise<ImportResult> {
  const admin = await requireEmployee("ADMIN");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, created: 0, errors: [{ row: 0, message: "No file uploaded." }] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await parseWorkbookRows(buffer);

  if (rows.length === 0) {
    return { ok: false, created: 0, errors: [{ row: 0, message: "The file has no data rows." }] };
  }

  let created = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // account for header row

    const name = row["Customer Name"]?.trim();
    const phone = row["Phone"]?.trim();

    if (!name) {
      errors.push({ row: rowNum, message: "Missing Customer Name." });
      continue;
    }
    if (!phone) {
      errors.push({ row: rowNum, message: "Missing Phone." });
      continue;
    }

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      errors.push({ row: rowNum, message: `Phone already belongs to ${existing.name} (${existing.code}) -- skipped.` });
      continue;
    }

    const language = CUSTOMER_LANGUAGES.includes(row["Language"] as (typeof CUSTOMER_LANGUAGES)[number])
      ? row["Language"]
      : "Arabic";

    try {
      const code = await generateCustomerCode();
      await prisma.customer.create({
        data: {
          code,
          name,
          phone,
          whatsapp: row["WhatsApp"]?.trim() || null,
          email: row["Email"]?.trim() || null,
          language,
          emirate: row["Emirate"]?.trim() || "Dubai",
          city: row["City"]?.trim() || null,
          area: row["Area"]?.trim() || null,
          buildingType: row["Building Type"]?.trim() || null,
          buildingName: row["Building Name"]?.trim() || null,
          flatNo: row["Flat No"]?.trim() || null,
          notes: row["Notes"]?.trim() || null,
          createdById: admin.id,
        },
      });
      created++;
    } catch {
      errors.push({ row: rowNum, message: "Could not create this customer." });
    }
  }

  revalidatePath("/admin/customers");
  return { ok: true, created, errors };
}
