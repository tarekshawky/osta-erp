"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { normalizeTarget, safeFetch, urlProblem } from "@/lib/links/linkCheck";
import { OUR_DOMAIN, domainOf, isOurDomain, readImport } from "@/lib/seo/backlinks";
import { inspectPage } from "@/lib/seo/backlinkInspect";
import type { Prisma } from "@/generated/prisma";
import { collectLinks } from "@/lib/seo/analyze";
import { parseBlocks } from "@/lib/cms/blocks";

export type ActionResult = { ok: boolean; error?: string; note?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const LINK_TYPES = ["dofollow", "nofollow", "sponsored", "ugc"];
const STATUSES = ["ACTIVE", "PENDING", "LOST", "REJECTED"];

export type BacklinkInput = {
  sourceUrl: string; targetUrl: string; anchorText: string; linkType: string; status: string; campaign: string; notes: string; discoveredAt: string;
};


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
  const target = normalizeTarget(input.targetUrl, OUR_DOMAIN);
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

const PAGE = "/admin/website/backlinks";
const SCAN_BATCH = 5;

// Opens the source page and looks for the link. Tracking only; it changes nothing on the other site.
export async function checkBacklink(id: string): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  const b = await prisma.backlink.findUnique({ where: { id } });
  if (!b) return fail("Backlink not found.");
  const out = await inspectPage([b]);
  await writeAudit(g.admin, "backlink.check", "Backlink", id, { status: b.status }, { found: out.found, lost: out.lost, failed: out.failed });
  revalidatePath(PAGE);
  return out.failed ? fail(out.note) : { ok: true, note: out.added ? `${out.note} ${out.added} more link(s) to your site found on that page.` : out.note };
}

// "Scan now" runs in small batches so a long list never hits the server's time limit; the browser asks for one batch after another.
export async function startBacklinkScan(): Promise<{ ok: boolean; error?: string; scanId?: string; pages?: string[]; batch?: number }> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return { ok: false, error: g.error };
  // Pages waiting longest come first. Each linking page is opened once, however many of our addresses it links to.
  const rows = await prisma.backlink.findMany({ where: { status: { not: "REJECTED" } }, orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }], select: { sourceUrl: true }, take: 5000 });
  if (!rows.length) return { ok: false, error: "There is nothing to scan yet. Add a backlink or import a CSV file first." };
  const scan = await prisma.backlinkScan.create({ data: { total: rows.length, startedByName: g.admin.name } });
  return { ok: true, scanId: scan.id, pages: [...new Set(rows.map((r) => r.sourceUrl))].slice(0, 2000), batch: SCAN_BATCH };
}

export async function scanBacklinkBatch(scanId: string, pages: string[]): Promise<{ ok: boolean; error?: string; found?: number; lost?: number; added?: number; failed?: number }> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const scan = await prisma.backlinkScan.findUnique({ where: { id: scanId } });
  if (!scan || scan.finishedAt) return { ok: false, error: "This scan is no longer running." };
  const rows = await prisma.backlink.findMany({ where: { sourceUrl: { in: pages.slice(0, SCAN_BATCH) }, status: { not: "REJECTED" } } });
  const groups = [...new Set(rows.map((r) => r.sourceUrl))].map((url) => rows.filter((r) => r.sourceUrl === url));
  const outs = await Promise.all(groups.map((group) => inspectPage(group).catch(() => ({ found: 0, lost: 0, failed: group.length, added: 0, note: "" }))));
  const total = (k: "found" | "lost" | "failed" | "added") => outs.reduce((a, o) => a + o[k], 0);
  const sum = { found: total("found"), lost: total("lost"), failed: total("failed"), added: total("added") };
  await prisma.backlinkScan.update({ where: { id: scanId }, data: { checked: { increment: rows.length }, found: { increment: sum.found }, lost: { increment: sum.lost }, failed: { increment: sum.failed }, added: { increment: sum.added } } });
  return { ok: true, ...sum };
}

export async function finishBacklinkScan(scanId: string): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  const scan = await prisma.backlinkScan.update({ where: { id: scanId }, data: { finishedAt: new Date() } });
  await writeAudit(g.admin, "backlink.scan", "BacklinkScan", scanId, null, { checked: scan.checked, found: scan.found, lost: scan.lost, added: scan.added, failed: scan.failed });
  revalidatePath(PAGE);
  return { ok: true, note: `Checked ${scan.checked}: ${scan.found} live, ${scan.lost} lost, ${scan.added} newly found, ${scan.failed} could not be opened.` };
}

// "Add a backlink": saves it and checks it straight away.
export async function addBacklink(sourceUrl: string, targetUrl: string): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  const source = sourceUrl.trim();
  const problem = urlProblem(source);
  if (problem) return fail(`Source URL: ${problem}`);
  if (isOurDomain(domainOf(source))) return fail("That page is on your own website. A backlink comes from another website.");
  const raw = targetUrl.trim();
  const target = raw ? normalizeTarget(raw, OUR_DOMAIN) : "";
  if (target === null) return fail("The target page must be a path on your site (/services) or an address on ostaservices.com.");
  const url = new URL(source).toString().slice(0, 500);
  if (await prisma.backlink.findFirst({ where: { sourceUrl: url, targetUrl: target } })) return fail("This backlink is already in the list.");
  const made = await prisma.backlink.create({ data: { sourceSite: domainOf(url), sourceUrl: url, targetUrl: target, status: "PENDING", origin: "manual" } });
  const out = await inspectPage([made]);
  await writeAudit(g.admin, "backlink.create", "Backlink", made.id, null, { sourceUrl: url, found: out.found, added: out.added });
  revalidatePath(PAGE);
  return { ok: true, note: `Added. ${out.note}${out.added ? ` ${out.added} more link(s) to your site found on that page.` : ""}` };
}

export async function importBacklinks(csv: string): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  if (csv.length > 3_000_000) return fail("The file is too large. Split it into files under 3 MB.");
  const parsed = readImport(csv);
  if (parsed.problem) return fail(parsed.problem);
  const existing = await prisma.backlink.findMany({ select: { id: true, sourceUrl: true, targetUrl: true } });
  const byKey = new Map(existing.map((e) => [`${e.sourceUrl}|${e.targetUrl}`, e.id]));
  const fresh: Prisma.BacklinkCreateManyInput[] = [];
  let updated = 0, skipped = parsed.skipped;
  for (const r of parsed.rows) {
    const target = r.targetUrl ? normalizeTarget(r.targetUrl, OUR_DOMAIN) : "";
    if (target === null) { skipped++; continue; }
    let url: string;
    try { url = new URL(r.sourceUrl).toString().slice(0, 500); } catch { skipped++; continue; }
    const key = `${url}|${target}`;
    const id = byKey.get(key);
    if (id !== undefined) {
      if (id && r.authority !== null) { await prisma.backlink.update({ where: { id }, data: { authority: r.authority } }); updated++; } else skipped++;
      continue;
    }
    byKey.set(key, "");
    fresh.push({ sourceSite: domainOf(url), sourceUrl: url, targetUrl: target, anchorText: r.anchorText, linkType: r.linkType, authority: r.authority, status: "PENDING", origin: "csv", ...(r.discoveredAt ? { discoveredAt: new Date(r.discoveredAt) } : {}) });
  }
  if (fresh.length) await prisma.backlink.createMany({ data: fresh });
  await writeAudit(g.admin, "backlink.import", "Backlink", null, null, { added: fresh.length, updated, skipped });
  revalidatePath(PAGE);
  return { ok: true, note: `Imported ${fresh.length} new link(s)${updated ? `, updated ${updated}` : ""}${skipped ? `, skipped ${skipped} (duplicates, your own pages or unusable rows)` : ""}. Press Scan now to check them.` };
}

export async function setBacklinkDecision(ids: string[], decision: "" | "keep" | "disavow"): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  if (!["", "keep", "disavow"].includes(decision)) return fail("Unknown decision.");
  const r = await prisma.backlink.updateMany({ where: { id: { in: ids.slice(0, 500) } }, data: { decision } });
  await writeAudit(g.admin, "backlink.decision", "Backlink", ids.length === 1 ? ids[0] : null, null, { decision: decision || "cleared", count: r.count });
  revalidatePath(PAGE);
  return { ok: true };
}

export async function markRemovalRequested(id: string): Promise<ActionResult> {
  const g = await guardPermission("seo.edit");
  if (!g.ok) return fail(g.error);
  await prisma.backlink.update({ where: { id }, data: { removalRequestedAt: new Date() } });
  await writeAudit(g.admin, "backlink.removalRequested", "Backlink", id, null, null);
  revalidatePath(PAGE);
  return { ok: true };
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
