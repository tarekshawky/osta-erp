import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

// Everything the public header, footer and contact details need, in one cacheable call.
export async function GET() {
  const [settings, menuRows, social] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.menuItem.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }] }),
    prisma.socialLink.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }),
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
  });
}
