"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { redirectProblem } from "@/lib/cms/pageRules";

export type ActionResult = { ok: boolean; error?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

export async function saveRedirect(from: string, to: string): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const f = from.trim().toLowerCase();
  const t = to.trim();
  const problem = redirectProblem(f, t);
  if (problem) return fail(problem);

  const live = await prisma.cmsPage.findFirst({ where: { status: "PUBLISHED", deletedAt: null, publishedVersion: { slug: f.slice(1) } } });
  if (live) return fail(`${f} is a live page — unpublish or rename it first.`);
  // Direct loop: the target already redirects back here.
  if (t.startsWith("/") && (await prisma.cmsRedirect.findUnique({ where: { fromPath: t } }))?.toPath === f) return fail("That would create a redirect loop.");

  await prisma.cmsRedirect.upsert({ where: { fromPath: f }, update: { toPath: t, permanent: true }, create: { fromPath: f, toPath: t } });
  await writeAudit(g.admin, "redirect.save", "CmsRedirect", f, null, { from: f, to: t });
  revalidatePath("/admin/website/redirects");
  return { ok: true };
}

export async function deleteRedirect(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const r = await prisma.cmsRedirect.findUnique({ where: { id } });
  if (!r) return fail("Redirect not found.");
  await prisma.cmsRedirect.delete({ where: { id } });
  await writeAudit(g.admin, "redirect.delete", "CmsRedirect", id, { from: r.fromPath, to: r.toPath }, null);
  revalidatePath("/admin/website/redirects");
  return { ok: true };
}
