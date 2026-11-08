"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma, Employee } from "@/generated/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { DUCTED_PAGE, DUCTED_SLUG } from "@/lib/cms/ductedPage";
import { DUCT_SLUG, withDuctCalculator } from "@/lib/cms/ductPage";
import * as duct from "@/lib/ductwork/service";
import * as split from "@/lib/splitquote/service";
import { SPLIT_SLUG, mergeSeo, withSplitBlocks, type RelatedLink } from "@/lib/cms/splitPage";
import { revalidateSite } from "@/lib/cms/publish";
import * as svc from "@/lib/acquote/service";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/acquote/status";

// Every action here changes a quotation or the price list, so each one checks the administrator's permission on the server and is
// written to the audit trail. The rules (which status may follow which) are enforced in lib/acquote as well.

export type QResult = { ok: boolean; error?: string; whatsapp?: string | null; emailed?: boolean; id?: string };
const fail = (error: string): QResult => ({ ok: false, error });

type Guarded = { error: string } | { actor: svc.Actor; admin: Employee };
async function guard(permission: "quotes.manage" | "pages.create" | "pages.edit" = "quotes.manage"): Promise<Guarded> {
  const g = await guardPermission(permission);
  if (!g.ok) return { error: g.error };
  return { actor: { type: "admin", id: g.admin.id, name: g.admin.name }, admin: g.admin };
}
const refresh = (id?: string) => {
  revalidatePath("/admin/self-quotes");
  if (id) revalidatePath(`/admin/self-quotes/${id}`);
};

export async function reviseQuote(id: string, lines: unknown, reason: string): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.reviseByAdmin(id, g.actor, lines, reason);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.revise", "SelfQuote", id, null, { version: r.version, reason });
  refresh(id);
  return { ok: true };
}

export async function setQuoteStatus(id: string, to: string, note: string): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  if (!(QUOTE_STATUSES as readonly string[]).includes(to)) return fail("Unknown status.");
  const r = await svc.setStatus(id, g.actor, to as QuoteStatus, note);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.status", "SelfQuote", id, null, { to, note });
  refresh(id);
  return { ok: true };
}

export async function sendQuote(id: string, note: string): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.sendToCustomer(id, g.actor, note);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.send", "SelfQuote", id, null, { note });
  refresh(id);
  return { ok: true, whatsapp: r.whatsapp, emailed: r.emailed };
}

export async function addQuoteNote(id: string, note: string): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.addNote(id, g.actor, note);
  if (!r.ok) return fail(r.error);
  refresh(id);
  return { ok: true };
}

export async function convertQuote(id: string): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.convertToOrder(id, g.actor);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.convert", "SelfQuote", id, null, { orderNumber: r.orderNumber });
  refresh(id);
  revalidatePath("/admin/orders");
  return { ok: true, id: r.orderId };
}

// ---- the price list ----

export async function savePricing(config: unknown): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.saveConfig(config, g.admin.name);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.pricing", "AcQuoteSettings", "default", null, null);
  revalidatePath("/admin/self-quotes/pricing");
  // The website shows the prices; it is told to refresh.
  void revalidateSite([DUCTED_SLUG]);
  return { ok: true };
}

// Creates the editable DRAFT of /ducted-ac-installation (content, calculator block and all SEO fields). Nothing goes live until the
// administrator reviews the draft and publishes it.
export async function createDuctedPage(): Promise<QResult> {
  const g = await guard("pages.create");
  if ("error" in g) return fail(g.error);
  const existing = await prisma.cmsPage.findFirst({ where: { slug: DUCTED_SLUG, deletedAt: null } });
  if (existing) return { ok: true, id: existing.id };
  const page = await prisma.cmsPage.create({
    data: {
      slug: DUCTED_SLUG, type: "page", titleEn: DUCTED_PAGE.titleEn, titleAr: DUCTED_PAGE.titleAr, showInMenus: false, showInSitemap: true,
      draftBlocks: DUCTED_PAGE.blocks() as unknown as Prisma.InputJsonValue, draftSeo: DUCTED_PAGE.seo as unknown as Prisma.InputJsonValue,
      createdById: g.admin.id, updatedById: g.admin.id,
    },
  });
  await writeAudit(g.admin, "cms.ducted.create", "CmsPage", page.id, null, { slug: DUCTED_SLUG });
  revalidatePath("/admin/website/pages");
  return { ok: true, id: page.id };
}


// ---- the ductwork calculator ----

export async function saveDuctPricing(config: unknown): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await duct.saveConfig(config, g.admin.name);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.duct.pricing", "AcQuoteSettings", "ductwork", null, null);
  revalidatePath("/admin/self-quotes/ductwork-pricing");
  void revalidateSite([DUCT_SLUG]);
  return { ok: true };
}

// Adds the quotation calculator to the DRAFT of the existing /duct-insulation page, after what is already there. Nothing else on the
// page is touched and nothing is published: the administrator moves the block where it should go, reviews the draft and publishes it.
export async function addDuctCalculatorToPage(): Promise<QResult> {
  const g = await guard("pages.edit");
  if ("error" in g) return fail(g.error);
  const page = await prisma.cmsPage.findFirst({ where: { slug: DUCT_SLUG, deletedAt: null } });
  if (!page) return fail(`The page /${DUCT_SLUG} does not exist yet. Create it under Website → Pages first, then come back here.`);
  const r = withDuctCalculator(page.draftBlocks);
  if (!r.ok) return fail(r.error);
  if (!r.added) return { ok: true, id: page.id };
  await prisma.cmsPage.update({ where: { id: page.id }, data: { draftBlocks: r.blocks as unknown as Prisma.InputJsonValue, updatedById: g.admin.id } });
  await writeAudit(g.admin, "cms.duct.calculator", "CmsPage", page.id, null, { slug: DUCT_SLUG });
  revalidatePath("/admin/website/pages");
  return { ok: true, id: page.id };
}

// ---- the Split AC calculator ----

export async function saveSplitPricing(config: unknown): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await split.saveConfig(config, g.admin.name);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.split.pricing", "AcQuoteSettings", "split", null, null);
  revalidatePath("/admin/self-quotes/split-pricing");
  void revalidateSite([SPLIT_SLUG]);
  return { ok: true };
}

// Upgrades the DRAFT of the existing /split-ac-installation page: adds the calculator, the FAQ and links to the related AC services after what is
// already there, and fills the SEO fields that are still empty. Nothing else on the page is touched and nothing is published.
export async function addSplitToPage(): Promise<QResult & { added?: string[] }> {
  const g = await guard("pages.edit");
  if ("error" in g) return fail(g.error);
  const page = await prisma.cmsPage.findFirst({ where: { slug: SPLIT_SLUG, deletedAt: null } });
  if (!page) return fail(`The page /${SPLIT_SLUG} does not exist yet. Create it under Website → Pages first, then come back here.`);
  const others = await prisma.cmsPage.findMany({ where: { status: "PUBLISHED", deletedAt: null, id: { not: page.id }, OR: [{ slug: { contains: "ac-repair" } }, { slug: { contains: "ac-maintenance" } }, { slug: { contains: "ac-service" } }, { slug: { contains: "maintenance" } }] }, select: { slug: true, titleEn: true, titleAr: true }, take: 4 });
  const related: RelatedLink[] = others.map((o) => ({ slug: o.slug, titleEn: o.titleEn, titleAr: o.titleAr }));
  const r = withSplitBlocks(page.draftBlocks, related);
  if (!r.ok) return fail(r.error);
  await prisma.cmsPage.update({ where: { id: page.id }, data: { draftBlocks: r.blocks as unknown as Prisma.InputJsonValue, draftSeo: mergeSeo(page.draftSeo) as Prisma.InputJsonValue, updatedById: g.admin.id } });
  await writeAudit(g.admin, "cms.split.upgrade", "CmsPage", page.id, null, { slug: SPLIT_SLUG, added: r.added });
  revalidatePath("/admin/website/pages");
  return { ok: true, id: page.id, added: r.added };
}

export async function duplicateQuoteAction(id: string): Promise<QResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.duplicateQuote(id, g.actor);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "quote.duplicate", "SelfQuote", id, null, { copy: r.number });
  refresh();
  return { ok: true, id: r.id };
}
