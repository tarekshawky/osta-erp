import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { seoReport } from "@/lib/seo/report";
import { isBuiltInSlug } from "@/lib/cms/pageRules";
import { StructureScreen } from "./StructureScreen";
import type { TreePage } from "@/components/cms/PageTreeManager";

export default async function PageStructurePage() {
  await requireEmployee("ADMIN");
  const [pages, menuRows, scores] = await Promise.all([
    prisma.cmsPage.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, parentId: true, sortOrder: true, titleEn: true, titleAr: true, slug: true, status: true, type: true, isHomepage: true, updatedAt: true, publishedVersion: { select: { slug: true } } },
    }),
    prisma.menuItem.findMany({ select: { menu: true, url: true } }),
    seoReport().then((r) => new Map(r.map((x) => [x.id, x.score]))),
  ]);
  const menusByUrl = new Map<string, Set<string>>();
  for (const m of menuRows) {
    const key = m.url.replace(/(.)\/$/, "$1");
    const set = menusByUrl.get(key) ?? new Set<string>();
    set.add(m.menu);
    menusByUrl.set(key, set);
  }

  const rows: TreePage[] = pages.map((p) => {
    const slug = p.publishedVersion?.slug ?? p.slug;
    const url = p.isHomepage ? "/" : `/${slug}`;
    return { id: p.id, parentId: p.parentId, sortOrder: p.sortOrder, titleEn: p.titleEn, titleAr: p.titleAr, slug, status: p.status, type: p.type, isHomepage: p.isHomepage, builtIn: isBuiltInSlug(p.slug), updatedAt: p.updatedAt.toISOString(), score: scores.get(p.id) ?? 0, menus: [...(menusByUrl.get(url) ?? [])] };
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Page structure" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Page structure</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Organise your pages as a tree: parents and sub-pages. Drag to reorder or nest, add pages under a parent, publish, preview, and choose which navigation menus a page appears in. Moving a page never changes its URL, content or SEO.</p>
          </div>
          <Link href="/admin/website/menus" className="text-sm font-medium text-blue-600">Navigation menus →</Link>
        </div>
        <StructureScreen pages={rows} />
      </div>
    </div>
  );
}
