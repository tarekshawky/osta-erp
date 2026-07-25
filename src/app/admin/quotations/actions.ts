"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
}

export async function deleteQuotation(id: string) {
  await requireAdmin();
  await prisma.quotation.delete({ where: { id } });
  redirect("/admin/quotations?toast=1");
}
