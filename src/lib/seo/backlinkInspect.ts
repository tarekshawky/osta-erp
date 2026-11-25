// Opens a page that should link to us and records what is really there. Server only (network + database).
import { prisma } from "@/lib/prisma";
import { findLinkToSite, parseLinks, safeFetch, type FoundLink } from "@/lib/links/linkCheck";
import { OUR_DOMAIN, decodeEntities, domainOf, readPage } from "./backlinks";
import type { Backlink, Prisma } from "@/generated/prisma";

export type Outcome = { found: number; lost: number; failed: number; added: number; note: string };
const MAX_NEW_PER_PAGE = 100;

export const pathOnly = (u: string) => {
  try { return new URL(u, `https://www.${OUR_DOMAIN}`).pathname.replace(/\/+$/, "") || "/"; } catch { return "/"; }
};

// All the records that share one linking page. The page is opened once, however many of our addresses it links to.
export async function inspectPage(rows: Backlink[]): Promise<Outcome> {
  const sourceUrl = rows[0].sourceUrl;
  const now = new Date();
  const count = rows.length;

  const markLost = async (row: Backlink, note: string, httpStatus: number | null, signals?: Prisma.InputJsonValue) => {
    await prisma.backlink.update({ where: { id: row.id }, data: { lastCheckedAt: now, lastCheckNote: note, httpStatus, ...(signals ? { signals } : {}), ...(row.status === "REJECTED" ? {} : { status: "LOST", lostAt: row.lostAt ?? now }) } });
  };
  // A page that cannot be read (blocked, timed out, server error) proves nothing: the links keep their status.
  const failed = async (note: string, httpStatus: number | null): Promise<Outcome> => {
    await prisma.backlink.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { lastCheckedAt: now, lastCheckNote: note, httpStatus } });
    return { found: 0, lost: 0, failed: count, added: 0, note };
  };

  let page;
  try {
    page = await safeFetch(sourceUrl, { wantBody: true });
  } catch (err) {
    return failed(`Could not open the page: ${err instanceof Error ? err.message : "unknown error"}`, null);
  }
  if (page.html === null) {
    if (page.status === 404 || page.status === 410) {
      const note = `The page is gone (HTTP ${page.status}).`;
      for (const r of rows) await markLost(r, note, page.status);
      return { found: 0, lost: count, failed: 0, added: 0, note };
    }
    return failed(`The page answered with HTTP ${page.status}, so it could not be checked.`, page.status);
  }

  const links = parseLinks(page.html, page.finalUrl).map((l) => ({ ...l, text: decodeEntities(l.text) }));
  const signals = readPage(page.html, links, page.finalUrl) as unknown as Prisma.InputJsonValue;
  const covered = new Set<string>();
  let found = 0, lost = 0, note = "";
  for (const row of rows) {
    // A record without a target (a Search Console import) takes whichever of our addresses the page links to.
    const match = findLinkToSite(links, OUR_DOMAIN, row.targetUrl ? pathOnly(row.targetUrl) : undefined);
    if (!match) {
      note = "The page loads but no longer links to this address.";
      await markLost(row, note, page.status, signals);
      lost++;
      continue;
    }
    const path = pathOnly(match.link.href);
    covered.add(path);
    note = `Link found (${match.linkType}).`;
    await prisma.backlink.update({
      where: { id: row.id },
      data: {
        targetUrl: row.targetUrl || path, anchorText: match.link.text || row.anchorText, linkType: match.linkType, signals, httpStatus: page.status,
        lastCheckedAt: now, lastCheckNote: note, lostAt: null, ...(row.status === "REJECTED" ? {} : { status: "ACTIVE" }),
      },
    });
    found++;
  }
  const added = await addOthers(rows[0], links, covered, signals, page.status);
  return { found, lost, failed: 0, added, note };
}

// Other addresses of ours linked from the same page are backlinks too: record the ones we did not know.
async function addOthers(b: Backlink, links: FoundLink[], covered: Set<string>, signals: Prisma.InputJsonValue, httpStatus: number): Promise<number> {
  const known = await prisma.backlink.findMany({ where: { sourceUrl: b.sourceUrl }, select: { targetUrl: true } });
  const have = new Set([...covered, ...known.filter((k) => k.targetUrl).map((k) => pathOnly(k.targetUrl))]);
  const fresh = new Map<string, FoundLink>();
  for (const l of links) {
    if (!findLinkToSite([l], OUR_DOMAIN)) continue;
    const p = pathOnly(l.href);
    if (!have.has(p) && !fresh.has(p) && fresh.size < MAX_NEW_PER_PAGE) fresh.set(p, l);
  }
  if (fresh.size) {
    await prisma.backlink.createMany({
      data: [...fresh].map(([target, l]) => ({
        sourceSite: domainOf(b.sourceUrl), sourceUrl: b.sourceUrl, targetUrl: target, anchorText: l.text, linkType: findLinkToSite([l], OUR_DOMAIN)!.linkType, status: "ACTIVE", origin: "scan",
        authority: b.authority, signals, httpStatus, lastCheckedAt: new Date(), lastCheckNote: "Found while checking the page.",
      })),
    });
  }
  return fresh.size;
}
