import { prisma } from "@/lib/prisma";
import type { JsonLdBranch } from "@/lib/seo/jsonld";
import { toPublicBranch, type PublicBranch } from "./locations";

// Active branches (of active emirates) for the public site and for structured data. One query for the branches and one for the
// pages that describe their service categories, so every "Services in Ajman" link goes to a page that really exists.
export async function loadBranches(filter: { areaId?: string } = {}): Promise<{ pub: PublicBranch[]; ld: JsonLdBranch[] }> {
  const rows = await prisma.branch.findMany({
    where: { active: true, area: { active: true }, ...(filter.areaId ? { areaId: filter.areaId } : {}) },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    include: { area: { select: { slug: true, nameEn: true, nameAr: true } }, categories: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true, nameAr: true } } },
  });
  if (rows.length === 0) return { pub: [], ld: [] };
  const categoryIds = [...new Set(rows.flatMap((r) => r.categories.map((c) => c.id)))];
  const pages = categoryIds.length
    ? await prisma.cmsPage.findMany({ where: { catalogCategoryId: { in: categoryIds }, status: "PUBLISHED", deletedAt: null, publishedVersion: { isNot: null } }, select: { catalogCategoryId: true, publishedVersion: { select: { slug: true } } } })
    : [];
  const hrefOf = new Map(pages.map((p) => [p.catalogCategoryId!, `/${p.publishedVersion!.slug}`]));
  const pub = rows.map((r) => toPublicBranch(r, { area: r.area, categories: r.categories.map((c) => ({ nameEn: c.nameEn, nameAr: c.nameAr, href: hrefOf.get(c.id) ?? null })) }));
  const ld = rows.map((r, i): JsonLdBranch => ({
    slug: r.slug, nameEn: r.nameEn, streetEn: r.streetEn, localityEn: r.localityEn, regionEn: r.regionEn, addressEn: r.addressEn, postalCode: r.postalCode,
    latitude: r.latitude, longitude: r.longitude, phone: r.phone, email: r.email, mapsUrl: r.mapsUrl, appleMapsUrl: r.appleMapsUrl, businessProfileUrl: r.businessProfileUrl,
    images: r.images, hours: pub[i].hours, coverage: pub[i].coverage.map((c) => c.nameEn), faqs: pub[i].faqs.map((f) => ({ question: f.question.en, answer: f.answer.en })),
  }));
  return { pub, ld };
}

// What an emirate page needs beyond its blocks: its branches, the page it sits under, and the pages under it.
export async function loadAreaPageContext(page: { id: string; areaId: string | null; parentId: string | null; type: string }) {
  const [branches, parent, children] = await Promise.all([
    page.areaId ? loadBranches({ areaId: page.areaId }) : Promise.resolve({ pub: [], ld: [] }),
    page.parentId ? prisma.cmsPage.findFirst({ where: { id: page.parentId, deletedAt: null, status: "PUBLISHED", publishedVersion: { isNot: null } }, select: { publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } } }) : Promise.resolve(null),
    page.type === "area"
      ? prisma.cmsPage.findMany({ where: { parentId: page.id, deletedAt: null, status: "PUBLISHED", publishedVersion: { isNot: null } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } } })
      : Promise.resolve([]),
  ]);
  return {
    branches,
    parent: parent?.publishedVersion ? { slug: parent.publishedVersion.slug, titleEn: parent.publishedVersion.titleEn, titleAr: parent.publishedVersion.titleAr } : null,
    children: children.flatMap((c) => (c.publishedVersion ? [{ slug: c.publishedVersion.slug, titleEn: c.publishedVersion.titleEn, titleAr: c.publishedVersion.titleAr }] : [])),
  };
}
