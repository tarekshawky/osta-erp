"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { generateCustomerCode } from "@/lib/customerData";
import { findPossibleDuplicate, type DuplicateMatch } from "@/lib/customerMatch";
import type { CustomerType } from "@/generated/prisma";

export type CustomerFormInput = {
  type: CustomerType;
  name: string;
  companyName: string;
  trn: string;
  phone: string;
  whatsapp: string;
  email: string;
  language: string;
  emirate: string;
  city: string;
  area: string;
  buildingType: string;
  buildingName: string;
  flatNo: string;
  address: string;
  locationUrl: string;
  notes: string;
  status: string;
  leadSource: string;
};

export type CustomerActionResult = { ok: boolean; id?: string; error?: string; duplicate?: DuplicateMatch };

function validate(input: CustomerFormInput) {
  const billName = input.type === "COMPANY" ? input.companyName.trim() : input.name.trim();
  if (!billName) return "Customer name is required.";
  if (!input.phone.trim()) return "Phone number is required.";
  if (!input.emirate) return "Emirate is required.";
  return null;
}

export async function checkDuplicateCustomer(phone: string, whatsapp: string, email: string, excludeId?: string) {
  await requireEmployee("ADMIN");
  return findPossibleDuplicate({ phone, whatsapp, email, excludeId });
}

export type CustomerSearchResult = {
  id: string;
  code: string;
  type: CustomerType;
  name: string;
  companyName: string | null;
  trn: string | null;
  phone: string;
  whatsapp: string | null;
  emirate: string;
  buildingName: string | null;
  flatNo: string | null;
};

// Live search used by the New Order form's Customer Name field, so an existing
// customer can be picked instead of retyping their details (and risking a
// near-duplicate the phone-uniqueness check wouldn't catch, e.g. same person
// under a slightly different phone).
export async function searchCustomersByName(query: string): Promise<CustomerSearchResult[]> {
  await requireEmployee("ADMIN");
  const q = query.trim();
  if (q.length < 2) return [];

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
  });

  return customers.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    name: c.name,
    companyName: c.companyName,
    trn: c.trn,
    phone: c.phone,
    whatsapp: c.whatsapp,
    emirate: c.emirate,
    buildingName: c.buildingName,
    flatNo: c.flatNo,
  }));
}

export async function createCustomer(input: CustomerFormInput, force = false): Promise<CustomerActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  if (!force) {
    const duplicate = await findPossibleDuplicate({ phone: input.phone, whatsapp: input.whatsapp, email: input.email });
    if (duplicate) return { ok: false, duplicate };
  }

  // Phone is still the hard unique key -- if it matches an existing row even after
  // "Create Anyway", fold into that record instead of erroring, since two customers
  // can never share a phone number.
  const existing = await prisma.customer.findUnique({ where: { phone: input.phone.trim() } });
  if (existing) return { ok: true, id: existing.id };

  const code = await generateCustomerCode();
  const billName = input.type === "COMPANY" ? input.companyName.trim() : input.name.trim();

  const customer = await prisma.customer.create({
    data: {
      code,
      type: input.type,
      name: input.name.trim() || billName,
      companyName: input.type === "COMPANY" ? input.companyName.trim() || null : null,
      trn: input.type === "COMPANY" ? input.trn.trim() || null : null,
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim() || null,
      email: input.email.trim() || null,
      language: input.language,
      emirate: input.emirate,
      city: input.city.trim() || null,
      area: input.area.trim() || null,
      buildingType: input.buildingType.trim() || null,
      buildingName: input.buildingName.trim() || null,
      flatNo: input.flatNo.trim() || null,
      address: input.address.trim() || null,
      locationUrl: input.locationUrl.trim() || null,
      notes: input.notes.trim() || null,
      status: "Active",
      leadSource: input.leadSource || "Organic",
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/customers");
  return { ok: true, id: customer.id };
}

export async function updateCustomer(customerId: string, input: CustomerFormInput): Promise<CustomerActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) return { ok: false, error: "Customer not found." };

  if (input.phone.trim() !== existing.phone) {
    const clash = await prisma.customer.findUnique({ where: { phone: input.phone.trim() } });
    if (clash && clash.id !== customerId) return { ok: false, error: "Another customer already uses this phone number." };
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      type: input.type,
      name: input.name.trim(),
      companyName: input.type === "COMPANY" ? input.companyName.trim() || null : null,
      trn: input.type === "COMPANY" ? input.trn.trim() || null : null,
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim() || null,
      email: input.email.trim() || null,
      language: input.language,
      emirate: input.emirate,
      city: input.city.trim() || null,
      area: input.area.trim() || null,
      buildingType: input.buildingType.trim() || null,
      buildingName: input.buildingName.trim() || null,
      flatNo: input.flatNo.trim() || null,
      address: input.address.trim() || null,
      locationUrl: input.locationUrl.trim() || null,
      notes: input.notes.trim() || null,
      status: input.status,
      leadSource: input.leadSource || "Organic",
      updatedById: admin.id,
    },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true, id: customerId };
}

export async function setCustomerStatus(customerId: string, status: string) {
  const admin = await requireEmployee("ADMIN");
  await prisma.customer.update({ where: { id: customerId }, data: { status, updatedById: admin.id } });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true };
}

export async function addCustomerNote(customerId: string, note: string) {
  const admin = await requireEmployee("ADMIN");
  if (!note.trim()) return { ok: false, error: "Note cannot be empty." };
  await prisma.customerNote.create({ data: { customerId, note: note.trim(), createdById: admin.id } });
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true };
}

// Permanent delete is only allowed when the customer has zero historical
// transactions -- otherwise use setCustomerStatus(id, "Inactive") to deactivate
// while preserving financial/operational history.
export async function deleteCustomer(customerId: string) {
  await requireEmployee("ADMIN");
  const [orders, invoices, quotations] = await Promise.all([
    prisma.order.count({ where: { customerId } }),
    prisma.invoice.count({ where: { customerId } }),
    prisma.quotation.count({ where: { customerId } }),
  ]);
  if (orders > 0 || invoices > 0 || quotations > 0) {
    return { ok: false, error: "This customer has historical transactions and cannot be permanently deleted. Deactivate instead." };
  }
  await prisma.customer.delete({ where: { id: customerId } });
  revalidatePath("/admin/customers");
  redirect("/admin/customers?toast=deleted");
}
