import { prisma } from "@/lib/prisma";
import { readSections, type LegalSection } from "./content";
import type { SearchDoc } from "./search";

// What customers may see: published, not internal, not archived. The text is always the frozen published version, never the draft.
export const visible = { status: "PUBLISHED", kind: { not: "INTERNAL" }, publishedVersionId: { not: null } } as const;

export type PublicSummary = { number: number; code: string; slug: string; kind: string; countries: string[]; titleEn: string; titleAr: string; summaryEn: string; summaryAr: string; version: number; effectiveDate: string | null; publishedAt: string };

export async function publicIndex() {
  const [cats, docs] = await Promise.all([
    prisma.legalCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.legalDocument.findMany({ where: visible, orderBy: { number: "asc" }, include: { publishedVersion: true } }),
  ]);
  const categories = cats.map((c) => ({
    key: c.key, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr,
    documents: docs.filter((d) => d.categoryId === c.id && d.publishedVersion).map((d): PublicSummary => ({
      number: d.number, code: d.code, slug: d.slug, kind: d.kind, countries: d.countries,
      titleEn: d.publishedVersion!.titleEn, titleAr: d.publishedVersion!.titleAr, summaryEn: d.publishedVersion!.summaryEn, summaryAr: d.publishedVersion!.summaryAr,
      version: d.publishedVersion!.version, effectiveDate: d.publishedVersion!.effectiveDate?.toISOString() ?? null, publishedAt: d.publishedVersion!.publishedAt.toISOString(),
    })),
  })).filter((c) => c.documents.length > 0);
  return { categories };
}

export async function publicDocument(slug: string, version?: number) {
  const doc = await prisma.legalDocument.findFirst({
    where: { slug, ...visible },
    include: { category: true, publishedVersion: true, versions: { orderBy: { version: "desc" }, select: { version: true, publishedAt: true, effectiveDate: true, changeNote: true } } },
  });
  if (!doc || !doc.publishedVersion) return null;
  const v = version ? await prisma.legalDocumentVersion.findUnique({ where: { documentId_version: { documentId: doc.id, version } } }) : doc.publishedVersion;
  if (!v) return null;
  const related = doc.related.length ? await prisma.legalDocument.findMany({ where: { slug: { in: doc.related }, ...visible }, include: { publishedVersion: true } }) : [];
  const siblings = await prisma.legalDocument.findMany({ where: visible, orderBy: { number: "asc" }, select: { slug: true, number: true, publishedVersion: { select: { titleEn: true, titleAr: true } } } });
  const idx = siblings.findIndex((s) => s.slug === slug);
  const pn = (s?: (typeof siblings)[number]) => (s ? { slug: s.slug, titleEn: s.publishedVersion?.titleEn ?? "", titleAr: s.publishedVersion?.titleAr ?? "" } : null);
  return {
    code: doc.code, number: doc.number, slug: doc.slug, kind: doc.kind, countries: doc.countries, category: { key: doc.category.key, nameEn: doc.category.nameEn, nameAr: doc.category.nameAr },
    version: v.version, isLatest: v.id === doc.publishedVersionId, titleEn: v.titleEn, titleAr: v.titleAr, summaryEn: v.summaryEn, summaryAr: v.summaryAr, introEn: v.introEn, introAr: v.introAr,
    sections: readSections(v.sections) as LegalSection[], seo: v.seo, effectiveDate: v.effectiveDate?.toISOString() ?? null, publishedAt: v.publishedAt.toISOString(),
    versions: doc.versions.map((x) => ({ version: x.version, publishedAt: x.publishedAt.toISOString(), effectiveDate: x.effectiveDate?.toISOString() ?? null, changeNote: x.changeNote })),
    related: related.filter((r) => r.publishedVersion).map((r) => ({ slug: r.slug, titleEn: r.publishedVersion!.titleEn, titleAr: r.publishedVersion!.titleAr })),
    previous: pn(siblings[idx - 1]), next: pn(siblings[idx + 1]),
  };
}

export async function searchableDocs(): Promise<SearchDoc[]> {
  const docs = await prisma.legalDocument.findMany({ where: visible, include: { category: true, publishedVersion: true } });
  return docs.filter((d) => d.publishedVersion).map((d) => ({
    slug: d.slug, titleEn: d.publishedVersion!.titleEn, titleAr: d.publishedVersion!.titleAr, categoryKey: d.category.key, countries: d.countries, version: d.publishedVersion!.version,
    sections: readSections(d.publishedVersion!.sections), introEn: d.publishedVersion!.introEn, introAr: d.publishedVersion!.introAr,
  }));
}
