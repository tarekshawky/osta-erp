"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { applyPageLayout, nextChildOrder } from "@/lib/cms/pageTreeDb";
import type { LayoutRow } from "@/lib/cms/pageTree";
import { MENUS } from "@/lib/site/siteRules";

export type StructureResult = { ok: boolean; error?: string; changed?: number };
const fail = (error: string): StructureResult => ({ ok: false, error });

function refresh() {
  revalidatePath("/admin/website/structure");
  revalidatePath("/admin/website/pages");
  revalidatePath("/admin/website/menus");
}

// Drag-and-drop result: the new parent and position of every page that moved. Persists immediately.
export async function savePageLayout(layout: LayoutRow[]): Promise<StructureResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  if (!Array.isArray(layout) || layout.length > 5000) return fail("Invalid structure.");
  const res = await applyPageLayout(layout.map((r) => ({ id: String(r.id), parentId: r.parentId ? String(r.parentId) : null, sortOrder: Number(r.sortOrder) })));
  if (!res.ok) return fail(res.error);
  if (res.changed) {
    await writeAudit(g.admin, "cms.page.structure", "CmsPage", "tree", null, { pagesMoved: res.changed });
    await revalidateSite([]);
  }
  refresh();
  return { ok: true, changed: res.changed };
}

// "Parent page" picker (page creation lives in createPage; this is for an existing page). Goes last among its new siblings.
export async function setPageParent(pageId: string, parentId: string | null): Promise<StructureResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const page = await prisma.cmsPage.findFirst({ where: { id: pageId, deletedAt: null }, select: { parentId: true } });
  if (!page) return fail("Page not found.");
  if ((page.parentId ?? null) === (parentId || null)) return { ok: true, changed: 0 };
  const res = await applyPageLayout([{ id: pageId, parentId: parentId || null, sortOrder: await nextChildOrder(parentId || null) }]);
  if (!res.ok) return fail(res.error);
  await writeAudit(g.admin, "cms.page.parent", "CmsPage", pageId, { parentId: page.parentId }, { parentId: parentId || null });
  await revalidateSite([]);
  refresh();
  revalidatePath(`/admin/website/pages/${pageId}`);
  return { ok: true, changed: res.changed };
}

// The address a menu link to this page should use. Drafts use their draft slug so the link is ready for when they go live
// (the public site hides links to pages that are not published).
async function pageUrl(pageId: string) {
  const page = await prisma.cmsPage.findFirst({ where: { id: pageId, deletedAt: null }, select: { slug: true, isHomepage: true, titleEn: true, titleAr: true, publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } } });
  if (!page) return null;
  return { url: page.isHomepage ? "/" : `/${page.publishedVersion?.slug ?? page.slug}`, titleEn: page.publishedVersion?.titleEn ?? page.titleEn, titleAr: page.publishedVersion?.titleAr ?? page.titleAr };
}

// Adds the page to (or removes it from) one of the independent navigation menus.
export async function setPageInMenu(pageId: string, menu: string, inMenu: boolean): Promise<StructureResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  if (!(MENUS as readonly string[]).includes(menu)) return fail("Unknown menu.");
  const target = await pageUrl(pageId);
  if (!target) return fail("Page not found.");
  const existing = await prisma.menuItem.findMany({ where: { menu, url: target.url }, select: { id: true } });
  if (inMenu) {
    if (existing.length) return { ok: true, changed: 0 };
    const last = await prisma.menuItem.findFirst({ where: { menu, parentId: null }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    await prisma.menuItem.create({ data: { menu, labelEn: target.titleEn, labelAr: target.titleAr, url: target.url, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  } else {
    if (!existing.length) return { ok: true, changed: 0 };
    await prisma.menuItem.deleteMany({ where: { id: { in: existing.map((e) => e.id) } } });
  }
  await writeAudit(g.admin, inMenu ? "site.menu.add-page" : "site.menu.remove-page", "MenuItem", menu, null, { pageId, url: target.url });
  await revalidateSite([]);
  refresh();
  return { ok: true, changed: 1 };
}
