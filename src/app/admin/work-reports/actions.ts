"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";

export async function deleteWorkReport(id: string) {
  await requireEmployee("ADMIN");
  await prisma.workReport.delete({ where: { id } });
  revalidatePath("/admin/work-reports");
}
