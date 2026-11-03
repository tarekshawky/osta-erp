"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { BranchInput, type BranchInputValue } from "@/lib/locations/locations";
import type { Prisma } from "@/generated/prisma";

export type ActionResult = { ok: boolean; error?: string; id?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const done = (id?: string): ActionResult => {
  revalidatePath("/admin/website/locations");
  return { ok: true, id };
};

// Creates or edits a branch (a real office). Everything is checked here again: the form is only a convenience.
export async function saveBranch(id: string | null, input: BranchInputValue): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const parsed = BranchInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const v = parsed.data;

  const [area, clash, categories] = await Promise.all([
    prisma.serviceArea.findUnique({ where: { id: v.areaId }, select: { id: true } }),
    prisma.branch.findUnique({ where: { slug: v.slug }, select: { id: true } }),
    prisma.catalogCategory.count({ where: { id: { in: v.categoryIds } } }),
  ]);
  if (!area) return fail("Choose the emirate this branch is in.");
  if (clash && clash.id !== id) return fail("A branch with this code already exists.");
  if (categories !== v.categoryIds.length) return fail("One of the chosen service categories no longer exists.");

  const { categoryIds, ...rest } = v;
  const data = { ...rest, hours: rest.hours as unknown as Prisma.InputJsonValue, coverage: rest.coverage as unknown as Prisma.InputJsonValue, faqs: rest.faqs as unknown as Prisma.InputJsonValue };
  const before = id ? await prisma.branch.findUnique({ where: { id }, select: { slug: true, nameEn: true, active: true, latitude: true, longitude: true } }) : null;
  const saved = id
    ? await prisma.branch.update({ where: { id }, data: { ...data, categories: { set: categoryIds.map((c) => ({ id: c })) } } })
    : await prisma.branch.create({ data: { ...data, categories: { connect: categoryIds.map((c) => ({ id: c })) } } });
  await writeAudit(g.admin, id ? "branch.update" : "branch.create", "Branch", saved.id, before, { slug: v.slug, nameEn: v.nameEn, active: v.active, latitude: v.latitude, longitude: v.longitude });
  await revalidateSite([]); // the emirate page, its structured data and the sitemap pick the change up
  return done(saved.id);
}

export async function deleteBranch(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const b = await prisma.branch.findUnique({ where: { id }, select: { slug: true, nameEn: true } });
  if (!b) return fail("Branch not found.");
  await prisma.branch.delete({ where: { id } });
  await writeAudit(g.admin, "branch.delete", "Branch", id, b, null);
  await revalidateSite([]);
  return done();
}
