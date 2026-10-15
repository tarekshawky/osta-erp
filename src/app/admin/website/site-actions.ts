"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { menuProblem, settingsProblem, socialProblem, MENUS, type MenuItemInput, type SettingsInput } from "@/lib/site/siteRules";

export type ActionResult = { ok: boolean; error?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

function done(): ActionResult {
  revalidatePath("/admin/website", "layout");
  // Header/footer/contact appear on every page, so refresh the whole public site cache.
  void revalidateSite(["", "services", "pricing", "blog", "about", "contact"].filter(Boolean));
  return { ok: true };
}

export async function saveSiteSettings(input: SettingsInput): Promise<ActionResult> {
  const g = await guardPermission("company.edit");
  if (!g.ok) return fail(g.error);
  const problem = settingsProblem(input);
  if (problem) return fail(problem);

  const trim = (s: string) => s.trim();
  const data = {
    siteNameEn: trim(input.siteNameEn), siteNameAr: trim(input.siteNameAr), taglineEn: trim(input.taglineEn), taglineAr: trim(input.taglineAr),
    descriptionEn: trim(input.descriptionEn), descriptionAr: trim(input.descriptionAr), logoUrl: input.logoUrl, faviconUrl: input.faviconUrl,
    defaultLocale: input.defaultLocale, allowIndexing: input.allowIndexing, copyrightEn: trim(input.copyrightEn), copyrightAr: trim(input.copyrightAr),
    phone: trim(input.phone), whatsapp: input.whatsapp, whatsappMessageEn: trim(input.whatsappMessageEn), whatsappMessageAr: trim(input.whatsappMessageAr),
    email: trim(input.email), addressEn: trim(input.addressEn), addressAr: trim(input.addressAr), hoursEn: trim(input.hoursEn), hoursAr: trim(input.hoursAr),
    mapsUrl: trim(input.mapsUrl), businessProfileUrl: trim(input.businessProfileUrl), headerCtaLabelEn: trim(input.headerCtaLabelEn),
    headerCtaLabelAr: trim(input.headerCtaLabelAr), headerCtaUrl: trim(input.headerCtaUrl),
    footerAreas: input.footerAreas.map((a) => ({ en: a.en.trim(), ar: a.ar.trim() })),
    waPopupEnabled: input.waPopupEnabled, waPopupAutoOpen: input.waPopupAutoOpen, waPopupDelaySeconds: input.waPopupDelaySeconds,
    waPopupTitleEn: trim(input.waPopupTitleEn), waPopupTitleAr: trim(input.waPopupTitleAr), waPopupTextEn: trim(input.waPopupTextEn), waPopupTextAr: trim(input.waPopupTextAr),
    waPopupButtonEn: trim(input.waPopupButtonEn), waPopupButtonAr: trim(input.waPopupButtonAr),
  };
  const before = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  await prisma.siteSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  // The logo/favicon can be large data URLs -- keep them out of the audit trail.
  const brief = (d: Record<string, unknown> | null) => d && { ...d, logoUrl: d.logoUrl ? "[set]" : "", faviconUrl: d.faviconUrl ? "[set]" : "", updatedAt: undefined };
  await writeAudit(g.admin, "site.settings.save", "SiteSettings", "default", brief(before as never), brief(data));
  return done();
}

export async function saveMenu(menu: string, items: MenuItemInput[]): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  if (!(MENUS as readonly string[]).includes(menu)) return fail("Unknown menu.");
  const problem = menuProblem(items);
  if (problem) return fail(problem);

  const row = (i: MenuItemInput, order: number) => ({
    menu, labelEn: i.labelEn.trim(), labelAr: i.labelAr.trim(), url: i.url.trim(), sortOrder: order,
    visible: i.visible, showDesktop: i.showDesktop, showMobile: i.showMobile, newTab: i.newTab,
  });
  const before = await prisma.menuItem.count({ where: { menu } });

  // Replace the whole menu atomically: a half-saved menu would break the public header.
  await prisma.$transaction(async (tx) => {
    await tx.menuItem.deleteMany({ where: { menu } });
    for (const [i, top] of items.entries()) {
      await tx.menuItem.create({ data: { ...row(top, i), children: { create: top.children.map((c, j) => row(c, j)) } } });
    }
  });
  await writeAudit(g.admin, "site.menu.save", "MenuItem", menu, { items: before }, { items: items.length });
  return done();
}

export type SocialInput = { platform: string; label: string; url: string; visible: boolean };

export async function saveSocialLinks(links: SocialInput[]): Promise<ActionResult> {
  const g = await guardPermission("company.edit");
  if (!g.ok) return fail(g.error);
  if (links.length > 20) return fail("At most 20 social links.");
  for (const l of links) {
    const problem = socialProblem(l);
    if (problem) return fail(problem);
  }
  const before = await prisma.socialLink.count();
  await prisma.$transaction([
    prisma.socialLink.deleteMany({}),
    prisma.socialLink.createMany({ data: links.map((l, i) => ({ platform: l.platform, label: l.label.trim(), url: l.url.trim(), visible: l.visible, sortOrder: i })) }),
  ]);
  await writeAudit(g.admin, "site.social.save", "SocialLink", null, { links: before }, { links: links.length });
  return done();
}
