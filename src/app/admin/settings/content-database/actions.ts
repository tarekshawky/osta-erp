"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/adminGuard";
import { copyContent, freeUpMainDatabase, type Counts } from "@/lib/contentCopy";

// Super Admin only: this moves the media library and audit log between databases.
async function superAdmin() {
  const s = await getSession();
  if (!s || s.role !== "SUPER_ADMIN") return null;
  return prisma.employee.findUnique({ where: { id: s.employeeId }, select: { id: true, name: true } });
}

export type CopyResult = { ok: boolean; error?: string; copied?: Counts; finished?: boolean };

export async function copyContentAction(): Promise<CopyResult> {
  const admin = await superAdmin();
  if (!admin) return { ok: false, error: "Only a Super Admin can do this." };
  const r = await copyContent();
  if (r.ok) await writeAudit(admin, "content-db.copy", "ContentDatabase", null, null, r.copied).catch(() => {});
  revalidatePath("/admin/settings/content-database");
  return r;
}

export async function freeUpAction(): Promise<CopyResult> {
  const admin = await superAdmin();
  if (!admin) return { ok: false, error: "Only a Super Admin can do this." };
  const r = await freeUpMainDatabase();
  if (r.ok) await writeAudit(admin, "content-db.free-up", "ContentDatabase", null, null, null).catch(() => {});
  revalidatePath("/admin/settings/content-database");
  return r;
}
