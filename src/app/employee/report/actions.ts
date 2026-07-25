"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { MAX_PHOTOS_PER_ITEM } from "@/lib/workReportData";

export type WorkReportItemInput = {
  deviceType: string;
  tonnage: string;
  gasType: string;
  brand: string;
  condition: string;
  description: string;
  photos: string[];
};

export type WorkReportFormInput = {
  date: string;
  customerName: string;
  customerPhone: string;
  emirate: string;
  buildingName: string;
  flatNo: string;
  items: WorkReportItemInput[];
};

export async function createWorkReport(input: WorkReportFormInput): Promise<{ ok: boolean; error?: string }> {
  const employee = await requireEmployee("EMPLOYEE");

  const items = input.items.filter((item) => item.deviceType.trim());
  if (items.length === 0) {
    return { ok: false, error: "Add at least one device inspection." };
  }
  for (const item of items) {
    if (item.photos.length > MAX_PHOTOS_PER_ITEM) {
      return { ok: false, error: `Each device can have up to ${MAX_PHOTOS_PER_ITEM} photos.` };
    }
  }

  await prisma.workReport.create({
    data: {
      date: input.date ? new Date(input.date) : new Date(),
      customerName: input.customerName.trim() || null,
      customerPhone: input.customerPhone.trim() || null,
      emirate: input.emirate.trim() || null,
      buildingName: input.buildingName.trim() || null,
      flatNo: input.flatNo.trim() || null,
      teamId: employee.teamId,
      createdById: employee.id,
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

  revalidatePath("/employee/report");
  revalidatePath("/admin/work-reports");
  return { ok: true };
}
