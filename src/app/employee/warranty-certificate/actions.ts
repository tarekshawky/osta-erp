"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { WARRANTY_DAYS } from "@/lib/invoiceData";

export type WarrantyCertificateFormInput = {
  customerName: string;
  emirate: string;
  phone: string;
  address: string;
  serviceProvided: string;
  equipmentLocation: string;
  warrantyFrom: string;
  warrantyTo: string;
  teamSupervisor: string;
};

export async function createWarrantyCertificate(
  input: WarrantyCertificateFormInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const employee = await requireEmployee("EMPLOYEE");

  if (!input.customerName.trim() || !input.serviceProvided.trim()) {
    return { ok: false, error: "Please fill in the customer name and service provided." };
  }

  const warrantyFrom = input.warrantyFrom ? new Date(input.warrantyFrom) : new Date();
  const warrantyTo = input.warrantyTo
    ? new Date(input.warrantyTo)
    : new Date(warrantyFrom.getTime() + WARRANTY_DAYS * 24 * 60 * 60 * 1000);

  const certificate = await prisma.warrantyCertificate.create({
    data: {
      date: new Date(),
      customerName: input.customerName.trim(),
      emirate: input.emirate.trim() || null,
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
      serviceProvided: input.serviceProvided.trim(),
      equipmentLocation: input.equipmentLocation.trim() || null,
      warrantyFrom,
      warrantyTo,
      teamSupervisor: input.teamSupervisor.trim() || null,
      teamId: employee.teamId,
      createdById: employee.id,
    },
  });

  revalidatePath("/employee/warranty-certificate");
  return { ok: true, id: certificate.id };
}
