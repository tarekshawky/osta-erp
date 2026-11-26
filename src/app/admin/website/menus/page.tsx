import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { MenuManager } from "@/components/cms/menus/MenuManager";
import type { PageOption } from "@/components/cms/menus/PagePicker";
import { buildMenuTree } from "@/lib/site/menuTree";
import { MENU_TABS, pathOf } from "@/lib/site/menuModel";
import type { MenuItemInput } from "@/lib/site/siteRules";

type Row = Awaited<ReturnType<typeof load>>[number];
const load = () => prisma.menuItem.findMany({ orderBy: { sortOrder: "asc" } });

function tree(rows: Row[], menu: string): MenuItemInput[] {
  const shape = (m: Row): Omit<MenuItemInput, "children"> => ({
    labelEn: m.labelEn, labelAr: m.labelAr, url: m.url, visible: m.visible, showDesktop: m.showDesktop, showMobile: m.showMobile, newTab: m.newTab,
    style: m.style, badgeEn: m.badgeEn, badgeAr: m.badgeAr,
  });
  return buildMenuTree(rows, menu, shape) as MenuItemInput[];
}

// Addresses the website itself serves (not pages made in the admin). A link to one of these is never "broken".
const SITE_ROUTES: [string, string, string][] = [
  ["/", "Home", "الرئيسية"], ["/services", "Services", "الخدمات"], ["/pricing", "Pricing & booking", "الأسعار"], ["/blog", "Blog", "المدونة"],
  ["/about", "About Us", "من نحن"], ["/contact", "Contact", "تواصل معنا"], ["/policies", "Policies & Legal", "السياسات والشؤون القانونية"],
];
const OTHER_ROUTES = ["/login", "/signup", "/more", "/join-osta-team", "/dashboard", "/profile", "/orders", "/invoices", "/duct-quote", "/split-quote", "/forgot-password", "/llms.txt", "/ads.txt", "/robots.txt", "/sitemap.xml"];
const ROUTE_PREFIXES = ["/orders/", "/dashboard/", "/invoices/", "/join-osta-team/", "/blog/category/", "/quote/", "/agreement/", "/agreements/", "/duct-quote/", "/split-quote/"];

export default async function MenusPage() {
  await requireEmployee("ADMIN");
  const [rows, cmsPages, services, posts, legal, redirects, areas, settings] = await Promise.all([
    load(),
    prisma.cmsPage.findMany({
      where: { deletedAt: null }, orderBy: { updatedAt: "desc" },
      select: { slug: true, type: true, status: true, isHomepage: true, showInMenus: true, menuParent: true, publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } },
    }),
    prisma.servicePage.findMany({ where: { published: true }, orderBy: { displayOrder: "asc" }, select: { slug: true, nameEn: true, nameAr: true } }),
    prisma.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, select: { slug: true, titleEn: true, titleAr: true } }),
    prisma.legalDocument.findMany({ where: { status: "PUBLISHED", kind: { not: "INTERNAL" }, publishedVersionId: { not: null } }, orderBy: { number: "asc" }, select: { slug: true, titleEn: true, titleAr: true } }),
    prisma.cmsRedirect.findMany({ select: { fromPath: true } }),
    prisma.serviceArea.findMany({
      where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { nameEn: true, nameAr: true, pages: { where: { status: "PUBLISHED", deletedAt: null }, take: 1, select: { publishedVersion: { select: { slug: true } } } } },
    }),
    prisma.siteSettings.findUnique({ where: { id: "default" }, select: { headerCtaLabelEn: true, headerCtaLabelAr: true } }),
  ]);

  // Like the website: the automatic areas list only includes areas that have a published page.
  const areaLinks = areas.map((a) => ({ labelEn: a.nameEn, labelAr: a.nameAr, url: a.pages[0]?.publishedVersion ? `/${a.pages[0].publishedVersion.slug}` : "" })).filter((a) => a.url);
  const areasWithoutPage = areas.length - areaLinks.length;

  const published = cmsPages.filter((p) => p.publishedVersion && p.status === "PUBLISHED");
  const pages: PageOption[] = [
    ...SITE_ROUTES.map(([url, labelEn, labelAr]) => ({ group: "Site page", url, labelEn, labelAr })),
    ...published.filter((p) => !p.isHomepage).map((p) => ({ group: "Page", url: `/${p.publishedVersion!.slug}`, labelEn: p.publishedVersion!.titleEn, labelAr: p.publishedVersion!.titleAr })),
    ...services.map((s) => ({ group: "Website service", url: `/services/${s.slug}`, labelEn: s.nameEn, labelAr: s.nameAr })),
    ...legal.map((d) => ({ group: "Policy", url: `/policies/${d.slug}`, labelEn: d.titleEn, labelAr: d.titleAr })),
    ...posts.map((b) => ({ group: "Blog article", url: `/blog/${b.slug}`, labelEn: b.titleEn, labelAr: b.titleAr })),
  ];
  const unique = [...new Map(pages.map((p) => [p.url, p])).values()];

  const live = new Set<string>([...unique.map((p) => p.url), ...OTHER_ROUTES, ...redirects.map((r) => pathOf(r.fromPath))]);
  // An address that only exists as an unpublished page: the website hides links to it.
  const drafts = cmsPages.filter((p) => !p.publishedVersion).map((p) => `/${p.slug}`).filter((u) => !live.has(u));

  // Pages the website adds to the header by itself, so the preview shows what visitors really see.
  const header = rows.filter((r) => r.menu === "header");
  const extraHeader = published
    .filter((p) => !p.isHomepage && p.showInMenus && p.menuParent === "" && (p.type === "page" || p.type === "service") && !header.some((r) => pathOf(r.url) === `/${p.publishedVersion!.slug}`))
    .map((p) => ({ labelEn: p.publishedVersion!.titleEn, labelAr: p.publishedVersion!.titleAr, url: `/${p.publishedVersion!.slug}` }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Menus" />
      <div className="px-6 py-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Menus</h2>
          <p className="text-sm text-slate-500">Five independent menus: changing one never changes another. You can also add a page to a menu from <Link href="/admin/website/structure" className="font-medium text-blue-600">Page structure</Link>.</p>
        </div>
        {areasWithoutPage > 0 && rows.some((r) => r.url === "#areas") && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{areasWithoutPage} active service area(s) have no published page, so the website does not list them under “Areas We Cover”{areaLinks.length === 0 ? " (with none left, the whole dropdown is hidden)" : ""}. Publish a page for an area to show it.</p>}
        {extraHeader.length > 0 && <p className="mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">{extraHeader.length} page(s) are added to the header automatically because their page settings say “Show in the navigation bar”. They appear in the preview but not in the list below; change that on each page.</p>}
        <MenuManager
          initial={Object.fromEntries(MENU_TABS.map((m) => [m.key, tree(rows, m.key)]))}
          pages={unique}
          known={{ live: [...live], drafts, prefixes: ROUTE_PREFIXES }}
          preview={{
            areas: areaLinks,
            services: services.map((s) => ({ labelEn: s.nameEn, labelAr: s.nameAr, url: `/services/${s.slug}` })),
            extraHeader,
            cta: { en: settings?.headerCtaLabelEn ?? "", ar: settings?.headerCtaLabelAr ?? "" },
          }}
        />
      </div>
    </div>
  );
}
