import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

// Everything the public header, footer and contact details need, in one cacheable call.
export async function GET() {
  const [settings, menuRows, social, integrations] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.menuItem.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }] }),
    prisma.socialLink.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.integrationSettings.findUnique({ where: { id: "default" } }),
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
  const { updatedAt: _updatedAt, id: _id, ...publicSettings } = settings;
  void _updatedAt;
  void _id;
  return apiSuccess({
    settings: publicSettings,
    menus,
    social: social.map((s) => ({ platform: s.platform, label: s.label, url: s.url })),
    // Public by nature (they appear in page source). Nothing secret lives here.
    integrations: integrations ? { ga4Id: integrations.ga4Id, gtmId: integrations.gtmId, metaPixelId: integrations.metaPixelId, searchConsoleToken: integrations.searchConsoleToken, bingToken: integrations.bingToken, requireConsent: integrations.requireConsent, consentTextEn: integrations.consentTextEn, consentTextAr: integrations.consentTextAr, privacyUrl: integrations.privacyUrl } : null,
  });
}
