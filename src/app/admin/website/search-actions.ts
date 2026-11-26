"use server";

import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { canAccessAdminSection } from "@/lib/adminSections";

export type PageHit = { id: string; titleEn: string; titleAr: string; path: string; status: string };

// Website pages matching what was typed in the Control Center search: by English or Arabic title, or by address.
export async function searchWebsitePages(query: string): Promise<PageHit[]> {
  const admin = await requireEmployee("ADMIN");
  if (admin.role !== "SUPER_ADMIN" && !canAccessAdminSection(admin.adminSections, "/admin/website/pages")) return [];
  const q = String(query ?? "").trim().slice(0, 80);
  if (q.length < 2) return [];
  const has = { contains: q, mode: "insensitive" as const };
  const slug = q.replace(/^\/+/, "");
  const pages = await prisma.cmsPage.findMany({
    where: { deletedAt: null, OR: [{ titleEn: has }, { titleAr: has }, ...(slug ? [{ slug: { contains: slug, mode: "insensitive" as const } }] : [])] },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: { id: true, titleEn: true, titleAr: true, slug: true, isHomepage: true, status: true },
  });
  return pages.map((p) => ({ id: p.id, titleEn: p.titleEn, titleAr: p.titleAr, path: p.isHomepage ? "/" : `/${p.slug}`, status: p.status }));
}
