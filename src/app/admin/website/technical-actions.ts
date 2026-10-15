"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { generateLlmsTxt, isAiPolicy, technicalProblem, TECHNICAL_KEYS, type TechnicalKey } from "@/lib/site/technicalFiles";
import { siteOrigin } from "@/lib/seo/context";
import type { Permission } from "@/lib/permissions";

export type TechResult = { ok: boolean; error?: string };

// robots.txt / llms.txt / AI policy decide who may read the site (SEO role); ads.txt and security.txt are Owner-only.
const permissionFor = (key: TechnicalKey): Permission => (key === "ads" || key === "security" ? "integrations.manage" : "seo.edit");

export async function saveTechnicalFile(key: string, input: { enabled: boolean; content: string }): Promise<TechResult> {
  if (!(TECHNICAL_KEYS as readonly string[]).includes(key)) return { ok: false, error: "Unknown file." };
  const k = key as TechnicalKey;
  const g = await guardPermission(permissionFor(k));
  if (!g.ok) return { ok: false, error: g.error };
  const content = input.content.replace(/\r\n/g, "\n");
  if (k === "ai-crawlers") {
    if (!isAiPolicy(content)) return { ok: false, error: "Choose one of the AI crawler options." };
  } else {
    const problem = technicalProblem(k, content);
    if (problem) return { ok: false, error: problem };
    if (input.enabled && k !== "robots" && !content.trim()) return { ok: false, error: "Write the file's content before switching it on." };
  }
  const before = await prisma.technicalFile.findUnique({ where: { key: k } });
  const enabled = k === "ai-crawlers" || k === "robots" ? true : input.enabled;
  await prisma.technicalFile.upsert({ where: { key: k }, update: { enabled, content }, create: { key: k, enabled, content } });
  await writeAudit(g.admin, "technical.save", "TechnicalFile", k, before ? { enabled: before.enabled, chars: before.content.length } : null, { enabled, chars: content.length });
  revalidatePath("/admin/website/technical");
  void revalidateSite([]);
  return { ok: true };
}

// A first draft of llms.txt from what the site already knows: name, description, contact, services, areas, key pages.
export async function generateLlmsDraft(): Promise<{ ok: boolean; error?: string; text?: string }> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const [s, services, areas, pages] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.servicePage.findMany({ where: { published: true }, orderBy: { displayOrder: "asc" }, select: { slug: true, nameEn: true, shortDescriptionEn: true } }),
    prisma.serviceArea.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { nameEn: true } }),
    prisma.cmsPage.findMany({ where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, publishedVersion: { isNot: null } }, select: { publishedVersion: { select: { slug: true, titleEn: true } } } }),
  ]);
  const origin = siteOrigin();
  const text = generateLlmsTxt({
    siteName: s?.siteNameEn || "OSTA Services", description: s?.descriptionEn || s?.taglineEn || "", origin,
    phone: s?.phone ?? "", email: s?.email ?? "", address: s?.addressEn ?? "",
    services: services.map((x) => ({ name: x.nameEn, path: `/services/${x.slug}`, summary: x.shortDescriptionEn })),
    pages: pages.flatMap((p) => (p.publishedVersion ? [{ name: p.publishedVersion.titleEn, path: `/${p.publishedVersion.slug}` }] : [])).slice(0, 30),
    areas: areas.map((a) => a.nameEn),
  });
  return { ok: true, text };
}
