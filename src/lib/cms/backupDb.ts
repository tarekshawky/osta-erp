import { prisma } from "@/lib/prisma";
import { parseBlocks } from "./blocks";
import { BACKUP_VERSION, type Bundle } from "./backup";
import type { FormField } from "@/lib/forms/forms";
import type { SettingsInput, MenuItemInput } from "@/lib/site/siteRules";
import type { Prisma } from "@/generated/prisma";

export async function buildExport(): Promise<Bundle> {
  const [pages, settings, menuRows, social, forms, areas, redirects] = await Promise.all([
    prisma.cmsPage.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.menuItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.cmsForm.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.serviceArea.findMany({ include: { region: { select: { slug: true } }, services: { select: { slug: true } } }, orderBy: { sortOrder: "asc" } }),
    prisma.cmsRedirect.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const item = (m: (typeof menuRows)[number]): Omit<MenuItemInput, "children"> => ({
    labelEn: m.labelEn, labelAr: m.labelAr, url: m.url, visible: m.visible, showDesktop: m.showDesktop, showMobile: m.showMobile, newTab: m.newTab,
  });
  const tree = (menu: string): MenuItemInput[] =>
    menuRows.filter((m) => m.menu === menu && m.parentId === null).map((t) => ({ ...item(t), children: menuRows.filter((c) => c.parentId === t.id).map((c) => ({ ...item(c), children: [] })) }));

  let site: SettingsInput | null = null;
  if (settings) {
    const { id: _id, updatedAt: _u, footerAreas, ...rest } = settings;
    void _id;
    void _u;
    site = { ...rest, footerAreas: Array.isArray(footerAreas) ? (footerAreas as { en: string; ar: string }[]) : [] } as SettingsInput;
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    pages: pages.map((p) => {
      const parsed = parseBlocks(p.draftBlocks);
      return {
        slug: p.slug, type: p.type, titleEn: p.titleEn, titleAr: p.titleAr, showInMenus: p.showInMenus, showInSitemap: p.showInSitemap,
        showLastUpdated: p.showLastUpdated, isHomepage: p.isHomepage, blocks: parsed.ok ? parsed.blocks : [], seo: (p.draftSeo ?? {}) as Record<string, unknown>,
      };
    }),
    site,
    menus: { header: tree("header"), footer: tree("footer") },
    social: social.map((s) => ({ platform: s.platform, label: s.label, url: s.url, visible: s.visible })),
    forms: forms.map((f) => ({
      slug: f.slug, nameEn: f.nameEn, nameAr: f.nameAr, fields: f.fields as unknown as FormField[], recipients: f.recipients, submitLabelEn: f.submitLabelEn,
      submitLabelAr: f.submitLabelAr, successEn: f.successEn, successAr: f.successAr, active: f.active,
    })),
    areas: areas.map((a) => ({
      slug: a.slug, regionSlug: a.region.slug, nameEn: a.nameEn, nameAr: a.nameAr, kind: a.kind, latitude: a.latitude, longitude: a.longitude,
      mapsUrl: a.mapsUrl, active: a.active, serviceSlugs: a.services.map((s) => s.slug),
    })),
    redirects: redirects.map((r) => ({ from: r.fromPath, to: r.toPath })),
  };
}

export type ImportReport = { created: Record<string, number>; updated: Record<string, number>; skipped: string[] };

// Applies an already-validated bundle in ONE transaction (all or nothing). Pages always become drafts: an existing
// page keeps its live (published) version untouched and only its working draft changes, with a history entry.
export async function applyBundle(bundle: Bundle, admin: { id: string; name: string }): Promise<ImportReport> {
  const report: ImportReport = { created: {}, updated: {}, skipped: [] };
  const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);

  await prisma.$transaction(
    async (tx) => {
      for (const p of bundle.pages) {
        const existing = await tx.cmsPage.findUnique({ where: { slug: p.slug } });
        const data = {
          type: p.type, titleEn: p.titleEn, titleAr: p.titleAr, showInMenus: p.showInMenus, showInSitemap: p.showInSitemap, showLastUpdated: p.showLastUpdated,
          draftBlocks: p.blocks as unknown as Prisma.InputJsonValue, draftSeo: p.seo as unknown as Prisma.InputJsonValue, updatedById: admin.id,
        };
        if (existing) {
          if (existing.deletedAt) {
            report.skipped.push(`“${p.slug}” was deleted earlier; skipped.`);
            continue;
          }
          await tx.cmsPage.update({ where: { id: existing.id }, data });
          const last = await tx.cmsPageVersion.findFirst({ where: { pageId: existing.id }, orderBy: { version: "desc" }, select: { version: true } });
          await tx.cmsPageVersion.create({
            data: { pageId: existing.id, version: (last?.version ?? 0) + 1, kind: "RESTORE", slug: existing.slug, titleEn: p.titleEn, titleAr: p.titleAr, blocks: data.draftBlocks, seo: data.draftSeo, createdById: admin.id, createdByName: `${admin.name} (import)` },
          });
          bump(report.updated, "pages");
        } else {
          if (p.isHomepage && (await tx.cmsPage.findFirst({ where: { isHomepage: true, deletedAt: null } }))) {
            report.skipped.push("A homepage already exists; the imported homepage was skipped.");
            continue;
          }
          await tx.cmsPage.create({ data: { slug: p.slug, isHomepage: p.isHomepage, status: "DRAFT", createdById: admin.id, ...data } });
          bump(report.created, "pages");
        }
      }

      if (bundle.site) {
        const { footerAreas, ...rest } = bundle.site;
        await tx.siteSettings.upsert({ where: { id: "default" }, update: { ...rest, footerAreas }, create: { id: "default", ...rest, footerAreas } });
        bump(report.updated, "siteSettings");
      }

      for (const menu of ["header", "footer"] as const) {
        const items = bundle.menus[menu];
        if (!items.length) continue; // an empty menu in the file never wipes the live one
        await tx.menuItem.deleteMany({ where: { menu } });
        for (const [i, top] of items.entries()) {
          const row = (m: MenuItemInput, o: number) => ({ menu, labelEn: m.labelEn, labelAr: m.labelAr, url: m.url, sortOrder: o, visible: m.visible, showDesktop: m.showDesktop, showMobile: m.showMobile, newTab: m.newTab });
          await tx.menuItem.create({ data: { ...row(top, i), children: { create: top.children.map((c, j) => row(c, j)) } } });
        }
        bump(report.updated, "menus");
      }

      if (bundle.social.length) {
        await tx.socialLink.deleteMany({});
        await tx.socialLink.createMany({ data: bundle.social.map((s, i) => ({ ...s, sortOrder: i })) });
        bump(report.updated, "socialLinks");
      }

      for (const f of bundle.forms) {
        const data = { nameEn: f.nameEn, nameAr: f.nameAr, fields: f.fields as unknown as Prisma.InputJsonValue, recipients: f.recipients, submitLabelEn: f.submitLabelEn, submitLabelAr: f.submitLabelAr, successEn: f.successEn, successAr: f.successAr, active: f.active };
        const exists = await tx.cmsForm.findUnique({ where: { slug: f.slug } });
        await tx.cmsForm.upsert({ where: { slug: f.slug }, update: data, create: { slug: f.slug, ...data } });
        bump(exists ? report.updated : report.created, "forms");
      }

      for (const a of bundle.areas) {
        const region = await tx.region.findUnique({ where: { slug: a.regionSlug } });
        if (!region) {
          report.skipped.push(`Area “${a.slug}”: emirate “${a.regionSlug}” doesn't exist here; skipped.`);
          continue;
        }
        const services = await tx.bookableService.findMany({ where: { slug: { in: a.serviceSlugs } }, select: { id: true } });
        const data = { regionId: region.id, nameEn: a.nameEn, nameAr: a.nameAr, kind: a.kind, latitude: a.latitude, longitude: a.longitude, mapsUrl: a.mapsUrl, active: a.active };
        const exists = await tx.serviceArea.findUnique({ where: { slug: a.slug } });
        await tx.serviceArea.upsert({ where: { slug: a.slug }, update: { ...data, services: { set: services } }, create: { slug: a.slug, ...data, services: { connect: services } } });
        bump(exists ? report.updated : report.created, "areas");
      }

      for (const r of bundle.redirects) {
        const live = await tx.cmsPage.findFirst({ where: { status: "PUBLISHED", deletedAt: null, publishedVersion: { slug: r.from.slice(1) } } });
        if (live) {
          report.skipped.push(`Redirect ${r.from}: a live page uses that address; skipped.`);
          continue;
        }
        await tx.cmsRedirect.upsert({ where: { fromPath: r.from }, update: { toPath: r.to }, create: { fromPath: r.from, toPath: r.to } });
        bump(report.updated, "redirects");
      }
    },
    { timeout: 60_000 }
  );
  return report;
}
