import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { AREAS_MENU_URL } from "@/lib/site/siteRules";
import { hideUnpublishedLinks } from "@/lib/site/menuLinks";

export function OPTIONS() {
  return corsPreflight();
}

// Everything the public header, footer and contact details need, in one cacheable call.
export async function GET() {
  const [settings, menuRows, social, integrations, menuPages, areaRows, allPages] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.menuItem.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }] }),
    prisma.socialLink.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.integrationSettings.findUnique({ where: { id: "default" } }),
    // Published pages marked "Show in the navigation bar": top level (type "page" only) or inside a dropdown.
    prisma.cmsPage.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, showInMenus: true, publishedVersion: { isNot: null } },
      orderBy: { createdAt: "asc" },
      select: { type: true, menuParent: true, areaId: true, publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } },
    }),
    // "Areas We Cover" follows the Service Areas screen: active areas show, inactive or deleted ones do not.
    prisma.serviceArea.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { slug: true, nameEn: true, nameAr: true, pages: { where: { status: "PUBLISHED", deletedAt: null }, take: 1, select: { publishedVersion: { select: { slug: true } } } } },
    }),
    // Every page, to know which addresses exist only as unpublished drafts.
    prisma.cmsPage.findMany({ where: { deletedAt: null }, select: { slug: true, publishedVersion: { select: { slug: true } } } }),
  ]);
  if (!settings) return apiSuccess(null);

  const shape = (m: (typeof menuRows)[number]) => ({
    labelEn: m.labelEn, labelAr: m.labelAr, url: m.url, newTab: m.newTab, showDesktop: m.showDesktop, showMobile: m.showMobile,
  });
  const menus: Record<string, unknown[]> = { header: [], footer: [] };
  for (const key of Object.keys(menus)) {
    const top = menuRows.filter((m) => m.menu === key && m.parentId === null);
    menus[key] = top.map((t) => ({ ...shape(t), children: menuRows.filter((c) => c.parentId === t.id).map((c) => ({ ...shape(c), children: [] })) }));
  }
  type NavItem = { labelEn: string; labelAr: string; url: string; newTab: boolean; showDesktop: boolean; showMobile: boolean; children: NavItem[] };
  const header = menus.header as NavItem[];
  // Top-level header rows map 1:1, in order, to the first items of `header`; remember them by id before anything is appended.
  const headerById = new Map(menuRows.filter((m) => m.menu === "header" && m.parentId === null).map((r, i) => [r.id, header[i]]));
  const leaf = (labelEn: string, labelAr: string, url: string): NavItem => ({ labelEn, labelAr, url, newTab: false, showDesktop: true, showMobile: true, children: [] });
  const hasUrl = (items: NavItem[], url: string): boolean => items.some((m) => m.url.replace(/\/$/, "") === url || hasUrl(m.children ?? [], url));

  // "Areas We Cover" appears only when the admin has added that item to the header menu (link "#areas"). It then lists the
  // active service areas (linked when the area has a published page); pages placed inside it follow.
  const areasMenu = header.find((m) => m.url === AREAS_MENU_URL) ?? null;
  if (areasMenu) {
    areasMenu.url = "";
    const manual = areasMenu.children;
    areasMenu.children = [...areaRows.map((a) => leaf(a.nameEn, a.nameAr, a.pages[0]?.publishedVersion ? `/${a.pages[0].publishedVersion.slug}` : "")), ...manual];
  }
  // The footer has no dropdowns, so the special item means nothing there.
  menus.footer = (menus.footer as NavItem[]).filter((m) => m.url !== AREAS_MENU_URL);


  for (const { publishedVersion: v, menuParent, type } of menuPages) {
    if (!v) continue;
    const url = `/${v.slug}`;
    if (hasUrl(header, url)) continue; // already linked by hand (or as an area), never twice
    if (menuParent === "") {
      if (type === "page") header.push(leaf(v.titleEn, v.titleAr, url));
    } else {
      const parent = menuParent === "areas" ? areasMenu : headerById.get(menuParent);
      parent?.children.push(leaf(v.titleEn, v.titleAr, url));
    }
  }
  // Never link visitors to a page that is still a draft (it would be "page not found").
  const liveSlugs = new Set(allPages.flatMap((p) => (p.publishedVersion ? [p.publishedVersion.slug] : [])));
  const draftSlugs = new Set(allPages.filter((p) => !p.publishedVersion && !liveSlugs.has(p.slug)).map((p) => p.slug));
  menus.header = hideUnpublishedLinks(menus.header as NavItem[], draftSlugs);
  menus.footer = hideUnpublishedLinks(menus.footer as NavItem[], draftSlugs);
  const { updatedAt: _updatedAt, id: _id, ...publicSettings } = settings;
  void _updatedAt;
  void _id;
  return apiSuccess({
    settings: publicSettings,
    menus,
    serviceAreas: areaRows.map((a) => ({ slug: a.slug, nameEn: a.nameEn, nameAr: a.nameAr, pageSlug: a.pages[0]?.publishedVersion?.slug ?? null })),
    social: social.map((s) => ({ platform: s.platform, label: s.label, url: s.url })),
    // Public by nature (they appear in page source). Nothing secret lives here.
    integrations: integrations ? { ga4Id: integrations.ga4Id, gtmId: integrations.gtmId, metaPixelId: integrations.metaPixelId, searchConsoleToken: integrations.searchConsoleToken, bingToken: integrations.bingToken, requireConsent: integrations.requireConsent, consentTextEn: integrations.consentTextEn, consentTextAr: integrations.consentTextAr, privacyUrl: integrations.privacyUrl } : null,
  });
}
