"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { codeProblem, type CodeInput } from "@/lib/site/codeRules";

export type CodeResult = { ok: boolean; error?: string };

const clean = (c: CodeInput) => ({ headCode: c.headCode.trim(), headCodeConsent: c.headCodeConsent, bodyCode: c.bodyCode.trim(), bodyCodeConsent: c.bodyCodeConsent });

// Code that runs on visitors' browsers is as sensitive as the tracking integrations: Owner only (integrations.manage).
// The audit log records that code changed and how long it is, never the code itself.
export async function saveGlobalCode(input: CodeInput): Promise<CodeResult> {
  const g = await guardPermission("integrations.manage");
  if (!g.ok) return { ok: false, error: g.error };
  const problem = codeProblem(input);
  if (problem) return { ok: false, error: problem };
  const data = clean(input);
  const before = await prisma.integrationSettings.findUnique({ where: { id: "default" }, select: { headCode: true, bodyCode: true } });
  await prisma.integrationSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  await writeAudit(g.admin, "code.global.save", "IntegrationSettings", "default", { headChars: before?.headCode.length ?? 0, bodyChars: before?.bodyCode.length ?? 0 }, { headChars: data.headCode.length, bodyChars: data.bodyCode.length });
  revalidatePath("/admin/website/code");
  void revalidateSite([""]);
  return { ok: true };
}

export async function savePageCode(pageId: string, input: CodeInput): Promise<CodeResult> {
  const g = await guardPermission("integrations.manage");
  if (!g.ok) return { ok: false, error: g.error };
  const problem = codeProblem(input);
  if (problem) return { ok: false, error: problem };
  const page = await prisma.cmsPage.findFirst({ where: { id: pageId, deletedAt: null }, select: { slug: true, headCode: true, bodyCode: true, isHomepage: true } });
  if (!page) return { ok: false, error: "Page not found." };
  const data = clean(input);
  await prisma.cmsPage.update({ where: { id: pageId }, data });
  await writeAudit(g.admin, "code.page.save", "CmsPage", pageId, { headChars: page.headCode.length, bodyChars: page.bodyCode.length }, { slug: page.slug, headChars: data.headCode.length, bodyChars: data.bodyCode.length });
  revalidatePath("/admin/website/page-code");
  void revalidateSite([page.isHomepage ? "" : page.slug]);
  return { ok: true };
}
