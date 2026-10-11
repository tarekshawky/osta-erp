"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { findLinkToSite, normalizeTarget, parseLinks, safeFetch, urlProblem } from "@/lib/links/linkCheck";
import { collectLinks } from "@/lib/seo/analyze";
import { parseBlocks } from "@/lib/cms/blocks";
import { siteOrigin } from "@/lib/seo/context";

export type ActionResult = { ok: boolean; error?: string; note?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const LINK_TYPES = ["dofollow", "nofollow", "sponsored", "ugc"];
const STATUSES = ["ACTIVE", "PENDING", "LOST", "REJECTED"];

export type BacklinkInput = {
  sourceUrl: string; targetUrl: string; anchorText: string; linkType: string; status: string; campaign: string; notes: string; discoveredAt: string;
};

const siteHost = () => new URL(siteOrigin()).hostname;

export async function saveBacklink(id: string | null, input: BacklinkInput): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);

  let source: URL;
  try {
    source = new URL(input.sourceUrl.trim());
  } catch {
    return fail("The source page must be a full web address (https://…).");
  }
  if (!/^https?:$/.test(source.protocol)) return fail("The source page must start with http:// or https://");
  const target = normalizeTarget(input.targetUrl, siteHost());
  if (!target) return fail("The target must be a path on your site (/services) or a full address on your own domain.");
  if (!LINK_TYPES.includes(input.linkType) || !STATUSES.includes(input.status)) return fail("Unknown link type or status.");
  const discoveredAt = input.discoveredAt ? new Date(input.discoveredAt) : new Date();
  if (isNaN(+discoveredAt)) return fail("Invalid discovered date.");

  const data = {
    sourceSite: source.hostname.replace(/^www\./, ""), sourceUrl: source.toString().slice(0, 500), targetUrl: target, anchorText: input.anchorText.trim().slice(0, 200),
    linkType: input.linkType, status: input.status, campaign: input.campaign.trim().slice(0, 80), notes: input.notes.trim().slice(0, 1000), discoveredAt,
  };
  const before = id ? await prisma.backlink.findUnique({ where: { id }, select: { sourceUrl: true, status: true } }) : null;
  const saved = id ? await prisma.backlink.update({ where: { id }, data }) : await prisma.backlink.create({ data });
  await writeAudit(g.admin, id ? "backlink.update" : "backlink.create", "Backlink", saved.id, before, { sourceUrl: data.sourceUrl, status: data.status });
  revalidatePath("/admin/website/backlinks");
  return { ok: true };
}

export async function deleteBacklink(id: string): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  const b = await prisma.backlink.findUnique({ where: { id } });
  if (!b) return fail("Backlink not found.");
  await prisma.backlink.delete({ where: { id } });
  await writeAudit(g.admin, "backlink.delete", "Backlink", id, { sourceUrl: b.sourceUrl }, null);
  revalidatePath("/admin/website/backlinks");
  return { ok: true };
}

// Opens the source page and looks for a link to your site. Tracking only; it changes nothing on the other site.
export async function checkBacklink(id: string): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  const b = await prisma.backlink.findUnique({ where: { id } });
  if (!b) return fail("Backlink not found.");

  const now = new Date();
  try {
    const res = await safeFetch(b.sourceUrl, { wantBody: true });
    if (res.html === null) {
      const note = `The page answered with HTTP ${res.status}.`;
      await prisma.backlink.update({ where: { id }, data: { lastCheckedAt: now, lastCheckNote: note, ...(res.status === 404 || res.status === 410 ? { status: "LOST" } : {}) } });
      revalidatePath("/admin/website/backlinks");
      return { ok: true, note };
    }
    const found = findLinkToSite(parseLinks(res.html, res.finalUrl), siteHost(), b.targetUrl.split(/[?#]/)[0]);
    const data = found
      ? { status: b.status === "PENDING" || b.status === "LOST" ? "ACTIVE" : b.status, linkType: found.linkType, anchorText: b.anchorText || found.link.text, lastCheckedAt: now, lastCheckNote: `Link found (${found.linkType}).` }
      : { status: b.status === "REJECTED" ? b.status : "LOST", lastCheckedAt: now, lastCheckNote: "The page loads but no longer links to this address." };
    await prisma.backlink.update({ where: { id }, data });
    await writeAudit(g.admin, "backlink.check", "Backlink", id, { status: b.status }, { status: data.status });
    revalidatePath("/admin/website/backlinks");
    return { ok: true, note: data.lastCheckNote };
  } catch (err) {
    const note = `Could not check: ${err instanceof Error ? err.message : "unknown error"}`;
    await prisma.backlink.update({ where: { id }, data: { lastCheckedAt: now, lastCheckNote: note } });
    revalidatePath("/admin/website/backlinks");
    return { ok: false, error: note };
  }
}

export type OutboundResult = { url: string; status: number | null; error?: string };

// Optional job: checks that the external links on a page still work (max 20, one request each).
export async function checkOutboundLinks(pageId: string): Promise<{ ok: boolean; error?: string; results?: OutboundResult[] }> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const page = await prisma.cmsPage.findFirst({ where: { id: pageId, deletedAt: null }, select: { draftBlocks: true } });
  if (!page) return { ok: false, error: "Page not found." };
  const parsed = parseBlocks(page.draftBlocks);
  const urls = [...new Set(collectLinks(parsed.ok ? parsed.blocks : []).filter((l) => /^https?:\/\//.test(l)))].slice(0, 20);

  const results: OutboundResult[] = [];
  for (const url of urls) {
    const problem = urlProblem(url);
    if (problem) {
      results.push({ url, status: null, error: problem });
      continue;
    }
    try {
      let r = await safeFetch(url, { wantBody: false });
      if ([403, 405, 501].includes(r.status)) r = await safeFetch(url, { wantBody: true }); // some servers refuse HEAD
      results.push({ url, status: r.status });
    } catch (err) {
      results.push({ url, status: null, error: err instanceof Error ? err.message : "failed" });
    }
  }
  await writeAudit(g.admin, "links.outbound.check", "CmsPage", pageId, null, { checked: results.length, broken: results.filter((r) => r.status === null || r.status >= 400).length });
  return { ok: true, results };
}
