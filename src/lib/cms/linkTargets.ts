import { prisma } from "@/lib/prisma";
import { isBuiltInSlug } from "@/lib/cms/pageRules";
import type { LinkTarget } from "@/components/cms/LinkInserter";

// Pages an editor can link to from inside text: the built-in site pages and every published CMS page.
export async function loadLinkTargets(excludePageId?: string): Promise<LinkTarget[]> {
  const published = await prisma.cmsPage.findMany({
    where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, publishedVersion: { isNot: null }, ...(excludePageId ? { NOT: { id: excludePageId } } : {}) },
    orderBy: { updatedAt: "desc" },
    select: { publishedVersion: { select: { slug: true, titleEn: true } } },
  });
  return [
    ...[["/", "Home"], ["/services", "Services"], ["/pricing", "Pricing & booking"], ["/blog", "Blog"], ["/about", "About Us"], ["/contact", "Contact"]].map(([url, label]) => ({ group: "Site pages", label, url })),
    // A published page that replaces a built-in one (About, Contact…) is already listed above.
    ...published.flatMap((p) => (p.publishedVersion && !isBuiltInSlug(p.publishedVersion.slug) ? [{ group: "Your published pages", label: p.publishedVersion.titleEn, url: `/${p.publishedVersion.slug}` }] : [])),
  ];
}
