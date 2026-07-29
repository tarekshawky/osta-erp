"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { MAX_PHOTOS_PER_ITEM } from "@/lib/workReportData";
import type { WorkReportFormInput } from "@/app/employee/report/actions";

export async function deleteWorkReport(id: string) {
  await requireEmployee("ADMIN");
  await prisma.workReport.delete({ where: { id } });
  revalidatePath("/admin/work-reports");
}

export async function updateWorkReport(
  id: string,
  input: WorkReportFormInput
): Promise<{ ok: boolean; error?: string }> {
  await requireEmployee("ADMIN");

  const items = input.items.filter((item) => item.deviceType.trim());
  if (items.length === 0) {
    return { ok: false, error: "Add at least one device inspection." };
  }
  for (const item of items) {
    if (item.photos.length > MAX_PHOTOS_PER_ITEM) {
      return { ok: false, error: `Each device can have up to ${MAX_PHOTOS_PER_ITEM} photos.` };
    }
  }

  await prisma.workReportItem.deleteMany({ where: { reportId: id } });
  await prisma.workReport.update({
    where: { id },
    data: {
      date: input.date ? new Date(input.date) : new Date(),
      customerName: input.customerName.trim() || null,
      customerPhone: input.customerPhone.trim() || null,
      emirate: input.emirate.trim() || null,
      buildingName: input.buildingName.trim() || null,
      flatNo: input.flatNo.trim() || null,
      items: {
        create: items.map((item) => ({
          deviceType: item.deviceType.trim(),
          tonnage: item.tonnage.trim() || null,
          gasType: item.gasType.trim() || null,
          brand: item.brand.trim() || null,
          condition: item.condition || "Good",
          description: item.description.trim() || null,
          photos: {
            create: item.photos.map((dataUrl) => ({ dataUrl })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin/work-reports");
  return { ok: true };
}
