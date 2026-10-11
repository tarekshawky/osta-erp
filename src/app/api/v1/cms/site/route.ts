import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

// Everything the public header, footer and contact details need, in one cacheable call.
export async function GET() {
  const [settings, menuRows, social, integrations, menuPages, areaRows] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.menuItem.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }] }),
    prisma.socialLink.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.integrationSettings.findUnique({ where: { id: "default" } }),
    // Published "page" type pages marked "Show in menus" join the header automatically.
    prisma.cmsPage.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, type: "page", showInMenus: true, publishedVersion: { isNot: null } },
      orderBy: { createdAt: "asc" },
      select: { publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } },
    }),
    // "Areas We Cover" follows the Service Areas screen: active areas show, inactive or deleted ones do not.
    prisma.serviceArea.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { slug: true, nameEn: true, nameAr: true, pages: { where: { status: "PUBLISHED", deletedAt: null }, take: 1, select: { publishedVersion: { select: { slug: true } } } } },
    }),
  ]);
  if (!settings) return apiSuccess(null);

  const shape = (m: (typeof menuRows)[number]) => ({
    labelEn: m.labelEn, labelAr: m.labelAr, url: m.url, newTab: m.newTab, showDesktop: m.showDesktop, showMobile: m.showMobile,
  });
  const menus: Record<string, unknown[]> = { header: [], footer: [] };
  for (const key of Object.keys(menus)) {
    const top = menuRows.filter((m) => m.menu === key && m.parentId === null);
    menus[key] = top.map((t) => ({ ...shape(t), children: menuRows.filter((c) => c.parentId === t.id).map(shape) }));
  }
  // Skip a page the admin already linked by hand, so it never appears twice.
  const linked = new Set((menus.header as { url: string }[]).map((m) => m.url.replace(/\/$/, "")));
  for (const { publishedVersion: v } of menuPages) {
    if (!v || linked.has(`/${v.slug}`)) continue;
    menus.header.push({ labelEn: v.titleEn, labelAr: v.titleAr, url: `/${v.slug}`, newTab: false, showDesktop: true, showMobile: true, children: [] });
  }
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
