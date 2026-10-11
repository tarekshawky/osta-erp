import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { MenuEditor, type PageOption } from "@/components/cms/MenuEditor";
import { AREAS_MENU_URL, type MenuItemInput } from "@/lib/site/siteRules";

type Row = Awaited<ReturnType<typeof load>>[number];
const load = () => prisma.menuItem.findMany({ orderBy: { sortOrder: "asc" } });

function tree(rows: Row[], menu: string): MenuItemInput[] {
  const shape = (m: Row): Omit<MenuItemInput, "children"> => ({
    labelEn: m.labelEn, labelAr: m.labelAr, url: m.url, visible: m.visible, showDesktop: m.showDesktop, showMobile: m.showMobile, newTab: m.newTab,
  });
  return rows.filter((m) => m.menu === menu && m.parentId === null).map((t) => ({ ...shape(t), children: rows.filter((c) => c.parentId === t.id).map((c) => ({ ...shape(c), children: [] })) }));
}

export default async function MenusPage() {
  await requireEmployee("ADMIN");
  const [rows, cmsPages] = await Promise.all([
    load(),
    prisma.cmsPage.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, publishedVersion: { isNot: null } },
      orderBy: { updatedAt: "desc" },
      select: { publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } },
    }),
  ]);
  // Built-in site pages first, then every page published from Website → Pages.
  const pages: PageOption[] = [
    ["/", "Home", "الرئيسية"], ["/services", "Services", "الخدمات"], ["/pricing", "Pricing & booking", "الأسعار"], ["/blog", "Blog", "المدونة"],
    ["/about", "About Us", "من نحن"], ["/contact", "Contact", "تواصل معنا"],
  ].map(([url, labelEn, labelAr]) => ({ group: "Site pages", url, labelEn, labelAr }));
  pages.push({ group: "Special", url: AREAS_MENU_URL, labelEn: "Areas We Cover", labelAr: "المناطق التي نغطيها" });
  for (const p of cmsPages) if (p.publishedVersion) pages.push({ group: "Your published pages", url: `/${p.publishedVersion.slug}`, labelEn: p.publishedVersion.titleEn, labelAr: p.publishedVersion.titleAr });
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Menus" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Drag items to reorder. To show the “Areas We Cover” dropdown in the header, add an item and choose it under Special. Sub-items appear as a dropdown. The log-in / dashboard button and language switch are part of the site and always shown.</p>
        <div className="flex max-w-4xl flex-col gap-6">
          <MenuEditor menu="header" title="Header menu" initial={tree(rows, "header")} pages={pages} />
          <MenuEditor menu="footer" title="Footer quick links" initial={tree(rows, "footer")} pages={pages} />
        </div>
      </div>
    </div>
  );
}
