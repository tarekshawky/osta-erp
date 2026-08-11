import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "@/lib/customerData";
import type { CustomerType } from "@/generated/prisma";

export type TransactionCustomerInput = {
  type: CustomerType;
  name: string;
  companyName?: string | null;
  trn?: string | null;
  phone: string;
  whatsapp?: string | null;
  emirate: string;
  buildingName?: string | null;
  flatNo?: string | null;
};

// Used by Order/Invoice/Quotation creation: link to the existing Customer master
// record when the phone matches, otherwise create one. Unlike the old per-action
// upsert helpers, this never overwrites an existing customer's profile fields --
// the Customers module is now the source of truth, edited only via its own form.
export async function findOrCreateCustomer(input: TransactionCustomerInput, createdById: string) {
  const phone = input.phone.trim();
  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) return existing;

  const code = await generateCustomerCode();
  return prisma.customer.create({
    data: {
      code,
      phone,
      type: input.type,
      name: input.name.trim(),
      companyName: input.type === "COMPANY" ? input.companyName?.trim() || null : null,
      trn: input.type === "COMPANY" ? input.trn?.trim() || null : null,
      whatsapp: input.whatsapp?.trim() || null,
      emirate: input.emirate,
      buildingName: input.buildingName?.trim() || null,
      flatNo: input.flatNo?.trim() || null,
      createdById,
    },
  });
}

export type DuplicateMatch = {
  customer: { id: string; code: string; name: string; phone: string };
  matchedOn: "phone" | "whatsapp" | "email";
};

// Secondary-signal duplicate check for the standalone "Add New Customer" form.
// Phone is already a hard unique constraint at the DB level, so a phone match here
// means "this would just update the existing record" -- whatsapp/email matches are
// softer warnings since a customer could plausibly reach us from a second phone.
export async function findPossibleDuplicate(input: {
  phone: string;
  whatsapp?: string;
  email?: string;
  excludeId?: string;
}): Promise<DuplicateMatch | null> {
  const select = { id: true, code: true, name: true, phone: true };

  const phone = input.phone.trim();
  if (phone) {
    const byPhone = await prisma.customer.findUnique({ where: { phone }, select });
    if (byPhone && byPhone.id !== input.excludeId) return { customer: byPhone, matchedOn: "phone" };
  }

  const whatsapp = input.whatsapp?.trim();
  if (whatsapp) {
    const byWhatsapp = await prisma.customer.findFirst({ where: { whatsapp }, select });
    if (byWhatsapp && byWhatsapp.id !== input.excludeId) return { customer: byWhatsapp, matchedOn: "whatsapp" };
  }

  const email = input.email?.trim();
  if (email) {
    const byEmail = await prisma.customer.findFirst({ where: { email }, select });
    if (byEmail && byEmail.id !== input.excludeId) return { customer: byEmail, matchedOn: "email" };
  }

  return null;
}
