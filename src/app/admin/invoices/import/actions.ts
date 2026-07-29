"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { parseWorkbookRows, type ImportResult } from "@/lib/excel";
import { CATEGORIES, PAYMENT_METHODS, SERVICE_TYPES, WARRANTY_DAYS } from "@/lib/invoiceData";

export async function importInvoicesFromExcel(formData: FormData): Promise<ImportResult> {
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

  const teams = await prisma.team.findMany();
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));

  let created = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // account for header row

    const customerName = row["Customer Name"]?.trim();
    const phone = row["Phone"]?.trim();
    const unitPrice = Number(row["Unit Price"] ?? row["Amount"]);

    if (!customerName) {
      errors.push({ row: rowNum, message: "Missing Customer Name." });
      continue;
    }
    if (!phone) {
      errors.push({ row: rowNum, message: "Missing Phone." });
      continue;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      errors.push({ row: rowNum, message: "Missing or invalid Unit Price." });
      continue;
    }

    const customerTypeRaw = row["Customer Type"]?.trim().toUpperCase();
    const customerType = customerTypeRaw === "COMPANY" ? "COMPANY" : "INDIVIDUAL";
    const category = CATEGORIES.includes(row["Category"] as (typeof CATEGORIES)[number])
      ? (row["Category"] as (typeof CATEGORIES)[number])
      : "AC";
    const serviceType = SERVICE_TYPES.includes(row["Service Type"] as (typeof SERVICE_TYPES)[number])
      ? (row["Service Type"] as (typeof SERVICE_TYPES)[number])
      : "Repair";
    const payment = PAYMENT_METHODS.includes(row["Payment"] as (typeof PAYMENT_METHODS)[number])
      ? (row["Payment"] as (typeof PAYMENT_METHODS)[number])
      : "Cash";
    const serviceName = row["Service"]?.trim() || `${category} Service`;
    const qty = Math.max(1, Math.round(Number(row["Qty"])) || 1);
    const teamName = row["Team"]?.trim().toLowerCase();
    const teamId = teamName ? teamByName.get(teamName) ?? null : admin.teamId ?? null;
    const date = row["Date"] && !Number.isNaN(Date.parse(row["Date"])) ? new Date(row["Date"]) : new Date();

    try {
      const customer = await prisma.customer.upsert({
        where: { phone },
        update: {
          type: customerType,
          name: customerName,
          companyName: customerType === "COMPANY" ? customerName : null,
          emirate: row["Emirate"]?.trim() || "Dubai",
          buildingName: row["Building Name"]?.trim() || null,
          flatNo: row["Flat No"]?.trim() || null,
        },
        create: {
          phone,
          type: customerType,
          name: customerName,
          companyName: customerType === "COMPANY" ? customerName : null,
          emirate: row["Emirate"]?.trim() || "Dubai",
          buildingName: row["Building Name"]?.trim() || null,
          flatNo: row["Flat No"]?.trim() || null,
        },
      });

      const amount = qty * unitPrice;
      const warrantyUntil = new Date(date);
      warrantyUntil.setDate(warrantyUntil.getDate() + WARRANTY_DAYS);

      const numberPrefix = `INV-${date.getFullYear()}-`;
      const lastInvoice = await prisma.invoice.findFirst({
        where: { number: { startsWith: numberPrefix } },
        orderBy: { number: "desc" },
      });
      const lastSeq = lastInvoice ? parseInt(lastInvoice.number.slice(numberPrefix.length), 10) : 0;
      const number = `${numberPrefix}${String(lastSeq + 1).padStart(6, "0")}`;

      await prisma.invoice.create({
        data: {
          number,
          date,
          customerId: customer.id,
          serviceType,
          category,
          payment,
          amount,
          status: "Paid",
          warrantyUntil,
          teamId,
          createdById: admin.id,
          items: { create: [{ serviceName, qty, unitPrice }] },
        },
      });

      created++;
    } catch {
      errors.push({ row: rowNum, message: "Could not create this invoice." });
    }
  }

  revalidatePath("/admin/invoices");
  return { ok: true, created, errors };
}
