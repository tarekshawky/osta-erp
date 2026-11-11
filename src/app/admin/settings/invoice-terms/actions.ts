"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/session";
import { SETTING_ID } from "@/lib/settings";
import { writeAudit } from "@/lib/adminGuard";
import { getInvoiceTerms } from "@/lib/invoiceTermsDb";
import { validateInvoiceTerms, type InvoiceTermsConfig } from "@/lib/invoiceTerms";
import { Prisma } from "@/generated/prisma";

type Result = { ok: boolean; error?: string };

async function admin() {
  const s = await getSession();
  if (!s || !isAdminRole(s.role)) return null;
  return prisma.employee.findUnique({ where: { id: s.employeeId }, select: { id: true, name: true } });
}

function refresh() {
  revalidatePath("/admin/settings/invoice-terms");
  revalidatePath("/admin/invoices", "layout");
  revalidatePath("/employee/invoices", "layout");
}

// Saves the terms printed on invoices. They apply to every invoice shown from now on, new and old (an invoice always prints the current terms).
export async function saveInvoiceTerms(input: InvoiceTermsConfig): Promise<Result> {
  const actor = await admin();
  if (!actor) return { ok: false, error: "Not authorized." };
  const v = validateInvoiceTerms(input);
  if (!v.ok) return { ok: false, error: v.error };
  const before = await getInvoiceTerms();
  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, invoiceTerms: v.value },
    update: { invoiceTerms: v.value },
  });
  await writeAudit(actor, "invoice-terms.update", "Setting", SETTING_ID, before, v.value).catch((e) => console.error("audit failed", e));
  refresh();
  return { ok: true };
}

// Back to the built-in wording.
export async function resetInvoiceTerms(): Promise<Result> {
  const actor = await admin();
  if (!actor) return { ok: false, error: "Not authorized." };
  const before = await getInvoiceTerms();
  await prisma.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, invoiceTerms: Prisma.DbNull },
    update: { invoiceTerms: Prisma.DbNull },
  });
  await writeAudit(actor, "invoice-terms.reset", "Setting", SETTING_ID, before, null).catch((e) => console.error("audit failed", e));
  refresh();
  return { ok: true };
}
