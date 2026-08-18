"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import type { InventoryActionResult } from "@/lib/inventoryData";

export type SupplierFormInput = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  notes: string;
  status: string;
};

function validate(input: SupplierFormInput) {
  if (!input.name.trim()) return "Supplier name is required.";
  if (!["Active", "Inactive"].includes(input.status)) return "Invalid status.";
  return null;
}

function buildData(input: SupplierFormInput) {
  return {
    name: input.name.trim(),
    contactPerson: input.contactPerson.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    notes: input.notes.trim() || null,
    status: input.status,
  };
}

function revalidateSupplierPaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/suppliers");
  revalidatePath("/admin/inventory/items");
}

export async function createSupplier(input: SupplierFormInput): Promise<InventoryActionResult & { id?: string }> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const supplier = await prisma.supplier.create({ data: { ...buildData(input), createdById: admin.id } });
  revalidateSupplierPaths();
  return { ok: true, id: supplier.id };
}

export async function updateSupplier(supplierId: string, input: SupplierFormInput): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) return { ok: false, error: "Supplier not found." };

  await prisma.supplier.update({ where: { id: supplierId }, data: buildData(input) });
  revalidateSupplierPaths();
  return { ok: true };
}
