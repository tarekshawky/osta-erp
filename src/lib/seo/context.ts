import { prisma } from "@/lib/prisma";
import type { SeoContext } from "./analyze";

// Routes that exist in the public app regardless of CMS content.
const STATIC_PATHS = ["/", "/services", "/pricing", "/blog", "/about", "/contact", "/login", "/signup", "/orders/new"];

export const siteOrigin = () => (process.env.SITE_URL ?? "https://www.ostaservices.com").replace(/\/$/, "");

// Everything the analyzer needs to know about the rest of the site: which URLs exist (for broken-link checks)
// and what every other page's SEO text is (for duplicate checks).
export async function loadSeoContext(excludePageId?: string): Promise<SeoContext> {
  const [pages, posts, services, redirects] = await Promise.all([
    prisma.cmsPage.findMany({
      where: { deletedAt: null },
      select: { id: true, titleEn: true, draftSeo: true, status: true, publishedVersion: { select: { slug: true } } },
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
  return { others, knownPaths };
}
