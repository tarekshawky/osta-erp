"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) redirect("/");
}

export async function deleteWarrantyCertificate(id: string) {
  await requireAdmin();
  await prisma.warrantyCertificate.delete({ where: { id } });
  redirect("/admin/warranty-certificates?toast=1");
}
