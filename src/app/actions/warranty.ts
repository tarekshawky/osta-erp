"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
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

function resolveDates(input: WarrantyCertificateFormInput) {
  const warrantyFrom = input.warrantyFrom ? new Date(input.warrantyFrom) : new Date();
  const warrantyTo = input.warrantyTo
    ? new Date(input.warrantyTo)
    : new Date(warrantyFrom.getTime() + WARRANTY_DAYS * 24 * 60 * 60 * 1000);
  return { warrantyFrom, warrantyTo };
}

export async function createWarrantyCertificate(
  input: WarrantyCertificateFormInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  if (!employee) return { ok: false, error: "Your session has expired. Please log in again." };

  if (!input.customerName.trim() || !input.serviceProvided.trim()) {
    return { ok: false, error: "Please fill in the customer name and service provided." };
  }

  const { warrantyFrom, warrantyTo } = resolveDates(input);

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
  revalidatePath("/admin/warranty-certificates");
  return { ok: true, id: certificate.id };
}

export async function updateWarrantyCertificate(
  id: string,
  input: WarrantyCertificateFormInput
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  const existing = await prisma.warrantyCertificate.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Certificate not found." };

  if (!input.customerName.trim() || !input.serviceProvided.trim()) {
    return { ok: false, error: "Please fill in the customer name and service provided." };
  }

  const { warrantyFrom, warrantyTo } = resolveDates(input);

  await prisma.warrantyCertificate.update({
    where: { id },
    data: {
      customerName: input.customerName.trim(),
      emirate: input.emirate.trim() || null,
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
      serviceProvided: input.serviceProvided.trim(),
      equipmentLocation: input.equipmentLocation.trim() || null,
      warrantyFrom,
      warrantyTo,
      teamSupervisor: input.teamSupervisor.trim() || null,
    },
  });

  revalidatePath(`/admin/warranty-certificates/${id}`);
  revalidatePath("/admin/warranty-certificates");
  revalidatePath(`/employee/warranty-certificate/${id}`);
  return { ok: true };
}
