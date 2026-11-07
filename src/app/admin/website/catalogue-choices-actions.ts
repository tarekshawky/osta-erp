"use server";

import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";

export type CatalogueChoice = { key: string; nameEn: string; nameAr: string; category: string; bookable: boolean; hasPage: boolean };

// For the page builder's "Service Catalogue" picker. A service's key is the website page that describes it, or else its booking
// service -- the same two names the public catalogue lists, so the website can find the service again by that key.
export async function listCatalogueChoices(): Promise<CatalogueChoice[]> {
  await requireEmployee("ADMIN");
  const [categories, pages, bookable] = await Promise.all([
    prisma.catalogCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { nameEn: true, services: { orderBy: { sortOrder: "asc" }, select: { service: { select: { id: true, nameEn: true, nameAr: true, active: true } } } } },
    }),
    prisma.cmsPage.findMany({
      where: { status: "PUBLISHED", deletedAt: null, publishedVersion: { isNot: null }, catalogServiceId: { not: null } },
      select: { catalogServiceId: true, publishedVersion: { select: { slug: true } } },
    }),
    prisma.bookableService.findMany({ where: { active: true, catalogServiceId: { not: null } }, select: { slug: true, catalogServiceId: true } }),
  ]);
  const page = new Map(pages.map((p) => [p.catalogServiceId!, p.publishedVersion!.slug]));
  const book = new Map(bookable.map((b) => [b.catalogServiceId!, b.slug]));
  const out: CatalogueChoice[] = [];
  for (const c of categories) {
    for (const l of c.services) {
      const s = l.service;
      if (!s.active) continue;
      const key = book.get(s.id) ?? page.get(s.id);
      if (!key) continue;
      out.push({ key, nameEn: s.nameEn, nameAr: s.nameAr, category: c.nameEn, bookable: book.has(s.id), hasPage: page.has(s.id) });
    }
  }
  return out;
}
