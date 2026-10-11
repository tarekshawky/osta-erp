import { prisma } from "@/lib/prisma";
import { parseBlocks } from "@/lib/cms/blocks";
import type { SeoContext } from "./analyze";
import type { JsonLdArea, JsonLdSite } from "./jsonld";
import { maskNames, pageText } from "./similarity";

// Routes that exist in the public app regardless of CMS content.
const STATIC_PATHS = ["/", "/services", "/pricing", "/blog", "/about", "/contact", "/login", "/signup", "/orders/new"];

export const siteOrigin = () => (process.env.SITE_URL ?? "https://www.ostaservices.com").replace(/\/$/, "");

// Everything the analyzer needs to know about the rest of the site: which URLs exist (for broken-link checks)
// and what every other page's SEO text is (for duplicate checks).
export async function loadSeoContext(excludePageId?: string): Promise<SeoContext> {
  const [pages, posts, services, redirects] = await Promise.all([
    prisma.cmsPage.findMany({
      where: { deletedAt: null },
      select: {
        id: true, titleEn: true, draftSeo: true, status: true, type: true, draftBlocks: true,
        publishedVersion: { select: { slug: true } }, area: { select: { nameEn: true, nameAr: true } },
      },
    }),
    prisma.blogPost.findMany({ select: { slug: true, titleEn: true, published: true, seoTitleEn: true, seoTitleAr: true, seoDescriptionEn: true, seoDescriptionAr: true } }),
    prisma.servicePage.findMany({ select: { slug: true, nameEn: true, published: true, seoTitleEn: true, seoTitleAr: true, seoDescriptionEn: true, seoDescriptionAr: true } }),
    prisma.cmsRedirect.findMany({ select: { fromPath: true } }),
  ]);

  const knownPaths = new Set(STATIC_PATHS);
  for (const p of pages) if (p.status === "PUBLISHED" && p.publishedVersion) knownPaths.add(`/${p.publishedVersion.slug}`);
  for (const b of posts) if (b.published) knownPaths.add(`/blog/${b.slug}`);
  for (const s of services) if (s.published) knownPaths.add(`/services/${s.slug}`);
  for (const r of redirects) knownPaths.add(r.fromPath); // old URLs still resolve (301)

  const others = [
    ...pages.filter((p) => p.id !== excludePageId).map((p) => {
      const s = (p.draftSeo ?? {}) as Record<string, string>;
      return { label: p.titleEn, titleEn: s.titleEn, titleAr: s.titleAr, descriptionEn: s.descriptionEn, descriptionAr: s.descriptionAr };
    }),
    ...posts.map((b) => ({ label: `Blog: ${b.titleEn}`, titleEn: b.seoTitleEn ?? undefined, titleAr: b.seoTitleAr ?? undefined, descriptionEn: b.seoDescriptionEn ?? undefined, descriptionAr: b.seoDescriptionAr ?? undefined })),
    ...services.map((s) => ({ label: `Service: ${s.nameEn}`, titleEn: s.seoTitleEn ?? undefined, titleAr: s.seoTitleAr ?? undefined, descriptionEn: s.seoDescriptionEn ?? undefined, descriptionAr: s.seoDescriptionAr ?? undefined })),
  ];
  const areaPages = pages
    .filter((p) => p.type === "area" && p.id !== excludePageId)
    .map((p) => {
      const parsed = parseBlocks(p.draftBlocks);
      const blocks = parsed.ok ? parsed.blocks : [];
      const names = [p.area?.nameEn ?? "", p.area?.nameAr ?? ""];
      return { label: p.titleEn, textEn: maskNames(pageText(blocks, "en"), names), textAr: maskNames(pageText(blocks, "ar"), names) };
    });
  return { others, knownPaths, areaPages };
}

// Business details for structured data -- always from the single site-settings source.
export async function loadJsonLdSite(): Promise<JsonLdSite> {
  const [settings, social] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.socialLink.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" }, select: { url: true } }),
  ]);
  return {
    origin: siteOrigin(),
    name: settings?.siteNameEn ?? "OSTA Services",
    phone: settings?.phone ? settings.phone.replace(/[^\d+]/g, "") : undefined,
    email: settings?.email || undefined,
    address: settings?.addressEn || undefined,
    businessProfileUrl: settings?.businessProfileUrl || undefined,
    sameAs: [...social.map((s) => s.url), ...(settings?.businessProfileUrl ? [settings.businessProfileUrl] : [])],
  };
}

export async function loadJsonLdArea(areaId: string | null): Promise<JsonLdArea | null> {
  if (!areaId) return null;
  const a = await prisma.serviceArea.findUnique({ where: { id: areaId }, include: { services: { where: { active: true }, select: { nameEn: true } } } });
  if (!a) return null;
  return { nameEn: a.nameEn, kind: a.kind, latitude: a.latitude, longitude: a.longitude, mapsUrl: a.mapsUrl || undefined, serviceNames: a.services.map((x) => x.nameEn) };
}
