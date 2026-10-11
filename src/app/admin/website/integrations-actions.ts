"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { integrationProblem, type IntegrationInput } from "@/lib/site/integrationRules";

export type ActionResult = { ok: boolean; error?: string };

// Owner-only (integrations.manage): these decide which third parties receive visitor data.
export async function saveIntegrations(input: IntegrationInput): Promise<ActionResult> {
  const g = await guardPermission("integrations.manage");
  if (!g.ok) return { ok: false, error: g.error };
  const problem = integrationProblem(input);
  if (problem) return { ok: false, error: problem };

  const data = {
    ga4Id: input.ga4Id.trim(), gtmId: input.gtmId.trim(), metaPixelId: input.metaPixelId.trim(), searchConsoleToken: input.searchConsoleToken.trim(),
    bingToken: input.bingToken.trim(), requireConsent: input.requireConsent, consentTextEn: input.consentTextEn.trim(), consentTextAr: input.consentTextAr.trim(),
    privacyUrl: input.privacyUrl.trim(),
  };
  const before = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  await prisma.integrationSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  const { updatedAt: _a, id: _b, ...beforeData } = before ?? ({} as Record<string, unknown>);
  void _a;
  void _b;
  await writeAudit(g.admin, "integrations.save", "IntegrationSettings", "default", before ? beforeData : null, data);
  revalidatePath("/admin/website/integrations");
  void revalidateSite(["", "services", "pricing", "blog", "about", "contact"].filter(Boolean));
  return { ok: true };
}
