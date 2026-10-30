"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { parseBlocks, type Block } from "@/lib/cms/blocks";
import { BUILT_IN_PAGES, createPreviewToken, isBuiltInSlug, slugProblem, slugify } from "@/lib/cms/pageRules";
import { BUILT_IN_SEEDS, type BuiltInSlug } from "@/lib/cms/pageSeeds";
import { revalidateSite } from "@/lib/cms/publish";
import { requireEmployee } from "@/lib/auth";
import { analyzePage, type AeoItem, type SeoIssue } from "@/lib/seo/analyze";
import { loadSeoContext } from "@/lib/seo/context";
import { homepageBlocks } from "@/lib/cms/homepageSeed";
import { computePublishProblems } from "@/lib/cms/publishGate";
import { nextChildOrder, redirectAddress, reparentChildren } from "@/lib/cms/pageTreeDb";
import type { Prisma } from "@/generated/prisma";

export type ActionResult = { ok: boolean; error?: string; id?: string; url?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

const PAGE_TYPES = ["page", "service", "area", "article", "landing"];

export type SeoInput = {
  titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string;
  canonical: string; noindex: boolean; ogImage: string; focusKeyword: string; secondaryKeywords: string;
};

export type DraftInput = {
  titleEn: string;
  titleAr: string;
  slug: string;
  type: string;
  showInMenus: boolean;
  menuParent: string;
  showInSitemap: boolean;
  showLastUpdated: boolean;
  blocks: Block[];
  seo: SeoInput;
};

function done(id?: string): ActionResult {
  revalidatePath("/admin/website/pages");
  if (id) revalidatePath(`/admin/website/pages/${id}`);
  return { ok: true, id };
}

async function nextVersion(tx: Prisma.TransactionClient, pageId: string) {
  const last = await tx.cmsPageVersion.findFirst({ where: { pageId }, orderBy: { version: "desc" }, select: { version: true } });
  return (last?.version ?? 0) + 1;
}

export async function createPage(input: { titleEn: string; titleAr: string; slug: string; type: string; parentId?: string | null }): Promise<ActionResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return fail(g.error);
  const slug = slugify(input.slug || input.titleEn);
  const problem = slugProblem(slug);
  if (problem) return fail(problem);
  if (!input.titleEn.trim() || !input.titleAr.trim()) return fail("Both the English and Arabic titles are required.");
  if (!PAGE_TYPES.includes(input.type)) return fail("Unknown page type.");
  if (await prisma.cmsPage.findUnique({ where: { slug } })) return fail("A page with this slug already exists.");

  const parentId = input.parentId || null;
  if (parentId && !(await prisma.cmsPage.findFirst({ where: { id: parentId, deletedAt: null }, select: { id: true } }))) return fail("The chosen parent page no longer exists.");
  const page = await prisma.cmsPage.create({
    data: { slug, type: input.type, titleEn: input.titleEn.trim(), titleAr: input.titleAr.trim(), parentId, sortOrder: await nextChildOrder(parentId), createdById: g.admin.id, updatedById: g.admin.id },
  });
  await writeAudit(g.admin, "cms.page.create", "CmsPage", page.id, null, { slug, type: input.type, parentId });
  return done(page.id);
}

// autosave=true only updates the working draft (no new history row); a manual save also snapshots a version.
export async function saveDraft(id: string, input: DraftInput, autosave: boolean): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);

  const page = await prisma.cmsPage.findFirst({ where: { id, deletedAt: null } });
  if (!page) return fail("Page not found.");
  if (!PAGE_TYPES.includes(input.type)) return fail("Unknown page type.");

  // The homepage always lives at "/" and stays a plain page: its slug and type can't be changed.
  const slug = page.isHomepage ? page.slug : slugify(input.slug);
  if (page.isHomepage) input = { ...input, type: "page", slug };
  // A built-in page (About, Contact…) keeps its own address.
  const builtIn = isBuiltInSlug(page.slug) && slug === page.slug;
  const problem = page.isHomepage ? null : slugProblem(slug, builtIn);
  if (problem) return fail(problem);
  if (slug !== page.slug && (await prisma.cmsPage.findUnique({ where: { slug } }))) return fail("A page with this slug already exists.");

  // The navigation parent must be the top level, the Areas We Cover dropdown, a real top-level header item, or "parent" (nested under the entry of its parent page).
  const menuParent = input.menuParent ?? "";
  if (menuParent !== "" && menuParent !== "areas" && menuParent !== "parent" && !(await prisma.menuItem.findFirst({ where: { id: menuParent, menu: "header", parentId: null } }))) return fail("Choose a valid navigation placement.");

  const parsed = parseBlocks(input.blocks);
  if (!parsed.ok) return fail(parsed.error);

  const data = {
    slug,
    type: input.type,
    titleEn: input.titleEn.trim(),
    titleAr: input.titleAr.trim(),
    showInMenus: input.showInMenus,
    menuParent,
    showInSitemap: input.showInSitemap,
    showLastUpdated: input.showLastUpdated,
    draftBlocks: parsed.blocks as unknown as Prisma.InputJsonValue,
    draftSeo: input.seo as unknown as Prisma.InputJsonValue,
    updatedById: g.admin.id,
  };

  await prisma.$transaction(async (tx) => {
    await tx.cmsPage.update({ where: { id }, data });
    if (!autosave) {
      await tx.cmsPageVersion.create({
        data: {
          pageId: id, version: await nextVersion(tx, id), kind: "SAVE", slug, titleEn: data.titleEn, titleAr: data.titleAr,
          blocks: data.draftBlocks, seo: data.draftSeo, createdById: g.admin.id, createdByName: g.admin.name,
        },
      });
    }
  });
  if (!autosave) await writeAudit(g.admin, "cms.page.save", "CmsPage", id, { slug: page.slug, title: page.titleEn }, { slug, title: data.titleEn });
  return done(id);
}

export async function publishPage(id: string, publishAtIso: string | null): Promise<ActionResult> {
  const g = await guardPermission("pages.publish");
  if (!g.ok) return fail(g.error);

  const page = await prisma.cmsPage.findFirst({ where: { id, deletedAt: null }, include: { publishedVersion: { select: { slug: true } } } });
  if (!page) return fail("Page not found.");

  const problems = await computePublishProblems(page);
  if (problems.length) return fail(`Can't publish yet: ${problems.join(" ")}`);

  let publishAt: Date | null = null;
  if (publishAtIso) {
    publishAt = new Date(publishAtIso);
    if (isNaN(+publishAt)) return fail("Invalid publish date.");
    if (publishAt <= new Date()) publishAt = null; // a past/now date just means publish now
  }

  const clash = await prisma.cmsPage.findFirst({
    where: { id: { not: id }, status: "PUBLISHED", deletedAt: null, publishedVersion: { slug: page.slug } },
  });
  if (clash) return fail("Another published page already uses this URL. Change this page's slug first.");

  const version = await prisma.$transaction(async (tx) => {
    const created = await tx.cmsPageVersion.create({
      data: {
        pageId: id, version: await nextVersion(tx, id), kind: publishAt ? "SCHEDULE" : "PUBLISH", slug: page.slug,
        titleEn: page.titleEn, titleAr: page.titleAr, blocks: page.draftBlocks as Prisma.InputJsonValue, seo: page.draftSeo as Prisma.InputJsonValue,
        createdById: g.admin.id, createdByName: g.admin.name,
      },
    });
    if (publishAt) {
      await tx.cmsPage.update({ where: { id }, data: { status: "SCHEDULED", publishAt, scheduledVersionId: created.id, updatedById: g.admin.id } });
    } else {
      await tx.cmsPage.update({
        where: { id },
        data: { status: "PUBLISHED", publishedVersionId: created.id, publishAt: null, scheduledVersionId: null, updatedById: g.admin.id },
      });
    }
    return created;
  });

  const oldSlug = page.publishedVersion?.slug;
  // The old address redirects to the new one; older redirects are pointed straight at the new address (no chains, no loops),
  // and a page that comes back to an address it used to redirect from stops that redirect.
  if (!publishAt && oldSlug && oldSlug !== page.slug) await redirectAddress(prisma, `/${oldSlug}`, `/${page.slug}`);
  else await prisma.cmsRedirect.deleteMany({ where: { fromPath: `/${page.slug}` } });

  await writeAudit(g.admin, publishAt ? "cms.page.schedule" : "cms.page.publish", "CmsPage", id, null, { slug: page.slug, version: version.version, publishAt });
  if (!publishAt) await revalidateSite([page.isHomepage ? "" : page.slug, ...(oldSlug && oldSlug !== page.slug ? [oldSlug] : [])]);
  return done(id);
}

export async function unpublishPage(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.publish");
  if (!g.ok) return fail(g.error);
  const page = await prisma.cmsPage.findFirst({ where: { id, deletedAt: null }, include: { publishedVersion: { select: { slug: true } } } });
  if (!page) return fail("Page not found.");
  await prisma.cmsPage.update({ where: { id }, data: { status: "DRAFT", publishedVersionId: null, scheduledVersionId: null, publishAt: null } });
  await writeAudit(g.admin, "cms.page.unpublish", "CmsPage", id, { slug: page.slug }, null);
  if (page.publishedVersion) await revalidateSite([page.isHomepage ? "" : page.publishedVersion.slug]);
  return done(id);
}

export async function restoreVersion(pageId: string, versionId: string): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const version = await prisma.cmsPageVersion.findFirst({ where: { id: versionId, pageId } });
  if (!version) return fail("Version not found.");
  const clash = await prisma.cmsPage.findFirst({ where: { slug: version.slug, id: { not: pageId } } });

  await prisma.$transaction(async (tx) => {
    await tx.cmsPage.update({
      where: { id: pageId },
      data: {
        titleEn: version.titleEn, titleAr: version.titleAr, slug: clash ? undefined : version.slug,
        draftBlocks: version.blocks as Prisma.InputJsonValue, draftSeo: version.seo as Prisma.InputJsonValue, updatedById: g.admin.id,
      },
    });
    await tx.cmsPageVersion.create({
      data: {
        pageId, version: await nextVersion(tx, pageId), kind: "RESTORE", slug: clash ? (await tx.cmsPage.findUnique({ where: { id: pageId } }))!.slug : version.slug,
        titleEn: version.titleEn, titleAr: version.titleAr, blocks: version.blocks as Prisma.InputJsonValue, seo: version.seo as Prisma.InputJsonValue,
        createdById: g.admin.id, createdByName: g.admin.name,
      },
    });
  });
  await writeAudit(g.admin, "cms.page.restore", "CmsPage", pageId, null, { restoredVersion: version.version });
  return done(pageId);
}

export async function duplicatePage(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return fail(g.error);
  const src = await prisma.cmsPage.findFirst({ where: { id, deletedAt: null } });
  if (!src) return fail("Page not found.");
  let slug = `${src.slug}-copy`;
  for (let n = 2; await prisma.cmsPage.findUnique({ where: { slug } }); n++) slug = `${src.slug}-copy-${n}`;

  // Fresh block ids so the copy never shares identity with the original.
  const blocks = (Array.isArray(src.draftBlocks) ? (src.draftBlocks as unknown as Block[]) : []).map((b) => ({ ...b, id: `blk_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}` }));
  const copy = await prisma.cmsPage.create({
    data: {
      slug, type: src.type, parentId: src.parentId, sortOrder: await nextChildOrder(src.parentId), titleEn: `${src.titleEn} (copy)`, titleAr: `${src.titleAr} (نسخة)`, showInMenus: src.showInMenus, menuParent: src.menuParent, showInSitemap: src.showInSitemap,
      draftBlocks: blocks as unknown as Prisma.InputJsonValue, draftSeo: src.draftSeo as Prisma.InputJsonValue, createdById: g.admin.id, updatedById: g.admin.id,
    },
  });
  await writeAudit(g.admin, "cms.page.duplicate", "CmsPage", copy.id, { from: src.id }, { slug });
  return done(copy.id);
}

// Soft delete: the row and its history stay recoverable; the page goes offline.
export async function deletePage(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const page = await prisma.cmsPage.findFirst({ where: { id, deletedAt: null }, include: { publishedVersion: { select: { slug: true } } } });
  if (!page) return fail("Page not found.");
  if (page.isHomepage) return fail("The homepage can't be deleted. Unpublish it to go back to the built-in homepage.");
  // Sub-pages move up to this page's parent (never orphaned). If the deleted page was live and its parent is live, visitors
  // of the old address are sent to the parent instead of a "not found" page.
  const parent = page.parentId ? await prisma.cmsPage.findFirst({ where: { id: page.parentId, deletedAt: null }, select: { publishedVersion: { select: { slug: true } } } }) : null;
  const parentSlug = parent?.publishedVersion?.slug ?? null;
  let moved = 0;
  // Free the slug so a new page can use it; keep the original in the audit trail.
  await prisma.$transaction(async (tx) => {
    moved = await reparentChildren(tx, id, page.parentId);
    await tx.cmsPage.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED", publishedVersionId: null, scheduledVersionId: null, parentId: null, slug: `${page.slug}--deleted-${Date.now()}` },
    });
    if (page.publishedVersion && parentSlug) await redirectAddress(tx, `/${page.publishedVersion.slug}`, `/${parentSlug}`);
  });
  await writeAudit(g.admin, "cms.page.delete", "CmsPage", id, { slug: page.slug, title: page.titleEn }, { subPagesMoved: moved, redirectedTo: page.publishedVersion && parentSlug ? `/${parentSlug}` : null });
  if (page.publishedVersion) await revalidateSite([page.publishedVersion.slug]);
  return done();
}

export async function createPreviewUrl(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const base = process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!base) return fail("Set the SITE_URL environment variable to enable previews.");
  const page = await prisma.cmsPage.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!page) return fail("Page not found.");
  return { ok: true, url: `${base.replace(/\/$/, "")}/preview/${id}?token=${createPreviewToken(id)}` };
}

// Live SEO check for the editor: runs the same analyzer the pages list and overview use, against the current (unsaved) draft.
export async function analyzeDraft(pageId: string, draft: DraftInput): Promise<{ score: number; issues: SeoIssue[]; aeo: AeoItem[] }> {
  await requireEmployee("ADMIN");
  const parsed = parseBlocks(draft.blocks);
  const [ctx, row] = await Promise.all([
    loadSeoContext(pageId),
    prisma.cmsPage.findUnique({ where: { id: pageId }, select: { area: { select: { nameEn: true, nameAr: true } } } }),
  ]);
  return analyzePage(
    {
      slug: slugify(draft.slug), type: draft.type, titleEn: draft.titleEn, titleAr: draft.titleAr, showInSitemap: draft.showInSitemap,
      showLastUpdated: draft.showLastUpdated, blocks: parsed.ok ? parsed.blocks : [], seo: draft.seo, areaNames: row?.area ? { en: row.area.nameEn, ar: row.area.nameAr } : undefined,
    },
    ctx
  );
}

// Creates an editable draft of a built-in page (About, Contact, Services, Blog, Pricing) holding what the site shows
// today. Visitors keep the built-in page until the draft is published; unpublishing returns to it.
export async function createBuiltInPage(slug: string): Promise<ActionResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return fail(g.error);
  if (!(BUILT_IN_PAGES as readonly string[]).includes(slug)) return fail("Unknown page.");
  if (await prisma.cmsPage.findFirst({ where: { slug, deletedAt: null } })) return fail("This page is already editable.");
  const seed = BUILT_IN_SEEDS[slug as BuiltInSlug];
  const page = await prisma.cmsPage.create({
    data: {
      slug, type: "page", titleEn: seed.titleEn, titleAr: seed.titleAr, showInMenus: false, showInSitemap: false,
      draftBlocks: seed.blocks() as unknown as Prisma.InputJsonValue,
      draftSeo: { titleEn: seed.seo.titleEn, titleAr: "", descriptionEn: seed.seo.descriptionEn, descriptionAr: "", canonical: "", noindex: false, ogImage: "", focusKeyword: "", secondaryKeywords: "" } as unknown as Prisma.InputJsonValue,
      createdById: g.admin.id, updatedById: g.admin.id,
    },
  });
  await writeAudit(g.admin, "cms.builtin.create", "CmsPage", page.id, null, { slug });
  return done(page.id);
}

// Creates the editable homepage as a DRAFT holding exactly what the site shows today. The public site keeps using
// its built-in homepage until the owner previews this one and clicks Publish.
export async function createHomepage(): Promise<ActionResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return fail(g.error);
  if (await prisma.cmsPage.findFirst({ where: { isHomepage: true, deletedAt: null } })) return fail("The homepage already exists.");
  if (await prisma.cmsPage.findUnique({ where: { slug: "home" } })) return fail("A page already uses the internal homepage address.");

  const page = await prisma.cmsPage.create({
    data: {
      slug: "home", isHomepage: true, type: "page", titleEn: "Home", titleAr: "الرئيسية", showInMenus: false, showInSitemap: false,
      draftBlocks: homepageBlocks() as unknown as Prisma.InputJsonValue,
      draftSeo: {
        titleEn: "OSTA Services — AC Repair & Home Maintenance in the UAE", titleAr: "", canonical: "", noindex: false, ogImage: "", focusKeyword: "", secondaryKeywords: "",
        descriptionEn: "Trusted AC repair, cleaning, installation, and home maintenance services across the UAE. Transparent pricing, certified technicians, same-day service, and a 14-day warranty.",
        descriptionAr: "",
      } as unknown as Prisma.InputJsonValue,
      createdById: g.admin.id, updatedById: g.admin.id,
    },
  });
  await writeAudit(g.admin, "cms.homepage.create", "CmsPage", page.id, null, { blocks: 6 });
  return done(page.id);
}
