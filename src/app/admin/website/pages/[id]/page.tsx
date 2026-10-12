import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { PageBuilder, type BuilderPage } from "@/components/cms/PageBuilder";
import { parseBlocks } from "@/lib/cms/blocks";
import type { SeoInput } from "@/app/admin/website/actions";
import { siteOrigin } from "@/lib/seo/context";
import { isBuiltInSlug } from "@/lib/cms/pageRules";

const emptySeo: SeoInput = { titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", canonical: "", noindex: false, ogImage: "", focusKeyword: "", secondaryKeywords: "" };

export default async function CmsPageEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const page = await prisma.cmsPage.findFirst({
    where: { id, deletedAt: null },
    include: {
      publishedVersion: { select: { slug: true } },
      area: { select: { nameEn: true } },
      versions: { orderBy: { version: "desc" }, take: 50, select: { id: true, version: true, kind: true, createdByName: true, createdAt: true } },
    },
  });
  if (!page) notFound();
  const headerTop = await prisma.menuItem.findMany({ where: { menu: "header", parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, labelEn: true, url: true } });
  // Pages an editor can link to from inside text: the built-in site pages and every published page.
  const published = await prisma.cmsPage.findMany({ where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, publishedVersion: { isNot: null }, NOT: { id } }, orderBy: { updatedAt: "desc" }, select: { publishedVersion: { select: { slug: true, titleEn: true } } } });
  const linkTargets = [
    ...[["/", "Home"], ["/services", "Services"], ["/pricing", "Pricing & booking"], ["/blog", "Blog"], ["/about", "About Us"], ["/contact", "Contact"]].map(([url, label]) => ({ group: "Site pages", label, url })),
    // A published page that replaces a built-in one (About, Contact…) is already listed above.
    ...published.flatMap((p) => (p.publishedVersion && !isBuiltInSlug(p.publishedVersion.slug) ? [{ group: "Your published pages", label: p.publishedVersion.titleEn, url: `/${p.publishedVersion.slug}` }] : [])),
  ];
  const hasAreasMenu = headerTop.some((m) => m.url === "#areas");
  const parents = headerTop.filter((m) => m.url !== "#areas");

  const parsed = parseBlocks(page.draftBlocks);
  const builderPage: BuilderPage = {
    id: page.id,
    status: page.status,
    publishAt: page.publishAt ? page.publishAt.toISOString() : null,
    publishedSlug: page.publishedVersion?.slug ?? null,
    titleEn: page.titleEn,
    titleAr: page.titleAr,
    slug: page.slug,
    type: page.type,
    showInMenus: page.showInMenus,
    menuParent: page.menuParent,
    showInSitemap: page.showInSitemap,
    showLastUpdated: page.showLastUpdated,
    areaName: page.area?.nameEn ?? null,
    isHomepage: page.isHomepage,
    builtIn: isBuiltInSlug(page.slug),
    blocks: parsed.ok ? parsed.blocks : [],
    seo: { ...emptySeo, ...((page.draftSeo as Partial<SeoInput>) ?? {}) },
  };

  return (
    <div>
      <AdminTopBar title="Website · Page Builder" />
      {!parsed.ok && <p className="bg-red-50 px-6 py-3 text-sm text-red-600">This draft has invalid content ({parsed.error}). It was loaded empty; restore a version from History if needed.</p>}
      <PageBuilder
        siteOrigin={siteOrigin()}
        page={builderPage}
        hasAreasMenu={hasAreasMenu}
        linkTargets={linkTargets}
        menuParents={parents.map((m) => ({ id: m.id, label: m.labelEn }))}
        versions={page.versions.map((v) => ({ id: v.id, version: v.version, kind: v.kind, by: v.createdByName ?? "—", at: v.createdAt.toISOString().slice(0, 16).replace("T", " ") }))}
      />
    </div>
  );
}
