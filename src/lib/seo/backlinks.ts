// Backlink Monitor rules: reading a linking page, rating a link, the totals, CSV import and the disavow file.
// Pure code (no database, no network), tested on its own. Nothing here invents data: a signal that is not known is simply not used.
import type { FoundLink } from "@/lib/links/linkCheck";

export const OUR_DOMAIN = "ostaservices.com";

export type Rating = "good" | "neutral" | "bad";
export const RATING_LABEL: Record<Rating, string> = { good: "Good", neutral: "Neutral", bad: "Bad" };

// What could be read from the page that links to us. null fields = not known (never checked, or the page did not say).
export type PageSignals = {
  title: string;
  lang: string; // "" when the page does not declare one
  externalLinks: number; // links on that page to other websites
  relevant: boolean; // mentions our kind of work
  local: boolean; // mentions the UAE or one of its emirates
};

export type RatingInput = {
  sourceUrl: string;
  anchorText: string;
  linkType: string;
  authority: number | null; // 0-100, only when an imported file provided it
  signals: PageSignals | null;
};

export type Tag = { label: string; tone: "good" | "neutral" | "bad" };
export type Assessment = { score: number; rating: Rating; tags: Tag[]; checked: boolean };

const RISKY_ENDINGS = ["xyz", "top", "click", "loan", "gq", "tk", "ml", "cf", "ga", "work", "rest", "icu", "buzz", "monster", "cam", "sbs"];
const TRUSTED = ["google.com", "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "wikipedia.org", "gulfnews.com", "khaleejtimes.com", "thenationalnews.com", "yellowpages.ae", "dubizzle.com", "bayut.com", "trustpilot.com"];
const SPAM_WORDS = /\b(casino|betting|porn|sex|viagra|cialis|payday|loans?|forex signals?|crypto giveaway|escort|replica|pills?)\b|قمار|مراهنات|اباحي/i;
const NETWORK_HOST = /(link[-_]?(farm|exchange|directory|wheel)|backlinks?|seo[-_]?links?|cheap[-_]?links|link[-_]?building|pbn)/i;
const SALESY_ANCHOR = /\b(cheap|best|buy|discount|lowest|offer|deal|price)\b|ارخص|أرخص|افضل|أفضل|خصم/i;
const SERVICE_WORDS = /\b(a\/?c|air ?condition(ing|er)?|hvac|duct|maintenance|repair|cleaning|plumb(ing|er)|paint(ing)?|carpentry|handyman|technician|home services?)\b|مكيف|تكييف|صيانة|تنظيف|سباكة|دهان|فني/i;
const UAE_WORDS = /\b(uae|emirates|dubai|abu ?dhabi|sharjah|ajman|al ?ain|ras al ?khaimah|fujairah|umm al ?quwain)\b|الإمارات|الامارات|دبي|أبوظبي|ابوظبي|الشارقة|عجمان|العين|الفجيرة|رأس الخيمة|أم القيوين/i;
const BRAND = /osta|أسطا|اسطا|ostaaeservices|ostaservices/i;

export const domainOf = (url: string): string => {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
};
export const isOurDomain = (host: string) => host === OUR_DOMAIN || host.endsWith(`.${OUR_DOMAIN}`);
const under = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export const decodeEntities = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });

// Reads the signals from the linking page's HTML.
export function readPage(html: string, links: FoundLink[], pageUrl: string): PageSignals {
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const lang = (/<html[^>]*\blang\s*=\s*["']?([a-zA-Z-]{2,12})/i.exec(html)?.[1] ?? "").toLowerCase();
  const here = domainOf(pageUrl);
  const externalLinks = links.filter((l) => { const d = domainOf(l.href); return d !== "" && /^https?:/.test(l.href) && d !== here && !isOurDomain(d); }).length;
  const text = `${title} ${html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ")}`.slice(0, 200_000);
  return { title, lang, externalLinks, relevant: SERVICE_WORDS.test(text), local: UAE_WORDS.test(text) };
}

export const GOOD_FROM = 70;
export const BAD_BELOW = 40;
export const ratingOf = (score: number): Rating => (score >= GOOD_FROM ? "good" : score < BAD_BELOW ? "bad" : "neutral");

// A plain, explainable score: it starts in the middle and every reason that moves it is shown as a tag. It is OSTA's own rule of thumb,
// not a Google score.
export function assessLink(i: RatingInput): Assessment {
  const host = domainOf(i.sourceUrl);
  const ending = host.split(".").pop() ?? "";
  const tags: Tag[] = [];
  let score = 55;
  const add = (points: number, label: string, tone: Tag["tone"]) => { score += points; tags.push({ label, tone }); };

  if (/\.(gov|edu|ac|sch)\.ae$|\.gov$|\.edu$/.test(host)) add(25, "Official or education site", "good");
  else if (TRUSTED.some((d) => under(host, d))) add(20, "Well-known site", "good");
  if (host.endsWith(".ae")) add(8, "UAE domain", "good");
  if (RISKY_ENDINGS.includes(ending)) add(-25, `Risky domain ending (.${ending})`, "bad");
  if (NETWORK_HOST.test(host)) add(-30, "Looks like a link network", "bad");

  if (i.authority !== null) {
    if (i.authority >= 60) add(18, `High authority (${i.authority})`, "good");
    else if (i.authority >= 30) add(4, `Medium authority (${i.authority})`, "neutral");
    else add(-10, `Low authority (${i.authority})`, "neutral");
  }

  const anchor = i.anchorText.trim();
  if (SPAM_WORDS.test(`${anchor} ${host} ${i.signals?.title ?? ""}`)) add(-45, "Spam words", "bad");
  else if (BRAND.test(anchor)) add(7, "Brand anchor", "good");
  else if (anchor && SALESY_ANCHOR.test(anchor) && SERVICE_WORDS.test(anchor)) add(-12, "Sales-keyword anchor", "bad");

  if (i.linkType !== "dofollow") add(-5, i.linkType === "nofollow" ? "Nofollow" : i.linkType === "sponsored" ? "Sponsored" : "User content (ugc)", "neutral");

  const s = i.signals;
  if (s) {
    if (s.externalLinks > 150) add(-25, `Very many outgoing links (${s.externalLinks})`, "bad");
    else if (s.externalLinks > 75) add(-10, `Many outgoing links (${s.externalLinks})`, "neutral");
    if (s.relevant) add(10, "Relevant topic", "good");
    else add(-8, "Unrelated topic", "neutral");
    if (s.local) add(5, "Mentions the UAE", "good");
    if (s.lang && !/^(en|ar)\b/.test(s.lang)) add(-12, `Other language (${s.lang})`, "bad");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, rating: ratingOf(score), tags, checked: !!s };
}

// ---- totals -------------------------------------------------------------------------------------------------------------------------

export const NEW_DAYS = 30;
export type StatRow = { status: string; sourceSite: string; discoveredAt: string; rating: Rating };
export const isLive = (status: string) => status === "ACTIVE";
export const isNew = (r: Pick<StatRow, "discoveredAt" | "status">, now: Date) => r.status !== "LOST" && r.status !== "REJECTED" && now.getTime() - new Date(r.discoveredAt).getTime() <= NEW_DAYS * 86_400_000;

export function backlinkStats(rows: StatRow[], now: Date) {
  const current = rows.filter((r) => r.status !== "LOST" && r.status !== "REJECTED");
  return {
    active: rows.filter((r) => isLive(r.status)).length,
    fresh: rows.filter((r) => isNew(r, now)).length,
    bad: current.filter((r) => r.rating === "bad").length,
    domains: new Set(rows.filter((r) => isLive(r.status)).map((r) => r.sourceSite)).size,
    quality: { good: current.filter((r) => r.rating === "good").length, neutral: current.filter((r) => r.rating === "neutral").length, bad: current.filter((r) => r.rating === "bad").length },
  };
}

// ---- disavow file and messages ------------------------------------------------------------------------------------------------------

// Google's format: one "domain:example.com" per line, "#" lines are comments.
export function disavowFile(domains: string[], date: string): string {
  const list = [...new Set(domains.map((d) => d.trim().toLowerCase().replace(/^www\./, "")).filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) && !isOurDomain(d)))].sort();
  return [`# Disavow list for ${OUR_DOMAIN}, made ${date} in the OSTA Backlink Monitor`, "# Review before uploading it in Google Search Console.", ...list.map((d) => `domain:${d}`)].join("\n") + "\n";
}

// A ready-written e-mail the owner sends from their own mail program. The Monitor never sends anything itself.
export function outreachDraft(kind: "contact" | "removal", sourceUrl: string, targetUrl: string): { subject: string; body: string } {
  const target = targetUrl.startsWith("/") ? `https://www.${OUR_DOMAIN}${targetUrl}` : targetUrl || `https://www.${OUR_DOMAIN}`;
  return kind === "removal"
    ? { subject: `Please remove the link to ${OUR_DOMAIN}`, body: `Hello,\n\nYour page ${sourceUrl} links to our website (${target}). We did not ask for this link and would like it removed.\n\nCould you please remove it and let us know when it is done?\n\nThank you,\nOSTA Services` }
    : { subject: `About your link to ${OUR_DOMAIN}`, body: `Hello,\n\nThank you for linking to us from ${sourceUrl} (${target}).\n\nWe would be glad to stay in touch.\n\nBest regards,\nOSTA Services` };
}

// ---- CSV import -----------------------------------------------------------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split("\n", 1)[0] ?? "";
  const delimiter = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

// Column names used by Google Search Console, Bing Webmaster Tools, Ahrefs, Semrush, Moz and plain spreadsheets.
const COLUMNS = {
  source: ["referring page url", "source url", "source page", "linking page", "from url", "backlink", "referring url", "source", "url"],
  target: ["target url", "destination url", "link url", "to url", "target page", "target", "destination"],
  anchor: ["anchor text", "anchor", "link anchor"],
  nofollow: ["nofollow", "is nofollow"],
  rel: ["link type", "type", "rel"],
  authority: ["domain rating", "dr", "domain authority", "da", "domain ascore", "page ascore", "authority score", "authority"],
  firstSeen: ["first seen", "first seen date", "discovery date", "discovered", "found", "date"],
} as const;

export type ImportRow = { sourceUrl: string; targetUrl: string; anchorText: string; linkType: string; authority: number | null; discoveredAt: string };
export type ImportParse = { rows: ImportRow[]; skipped: number; problem?: string };
export const MAX_IMPORT = 5000;

export function readImport(text: string): ImportParse {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], skipped: 0, problem: "The file has no rows." };
  const head = table[0].map((h) => h.trim().toLowerCase().replace(/[_-]+/g, " "));
  const col = (names: readonly string[]) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
  const at = Object.fromEntries(Object.entries(COLUMNS).map(([k, v]) => [k, col(v)])) as Record<keyof typeof COLUMNS, number>;
  if (at.source < 0) return { rows: [], skipped: 0, problem: "No column with the linking page was found. Name it “Source URL” (Search Console calls it “Linking page”)." };

  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const line of table.slice(1)) {
    const cell = (i: number) => (i >= 0 ? (line[i] ?? "").trim() : "");
    const sourceUrl = cell(at.source), targetUrl = cell(at.target);
    const host = domainOf(sourceUrl);
    const key = `${sourceUrl}|${targetUrl}`;
    if (!/^https?:\/\//i.test(sourceUrl) || !host || isOurDomain(host) || seen.has(key) || rows.length >= MAX_IMPORT) { skipped++; continue; }
    seen.add(key);
    const rel = cell(at.rel).toLowerCase();
    const nofollow = /^(true|yes|1|nofollow)$/i.test(cell(at.nofollow));
    const authority = cell(at.authority) === "" ? NaN : Number(cell(at.authority));
    const when = cell(at.firstSeen) ? new Date(cell(at.firstSeen)) : null;
    rows.push({
      sourceUrl: sourceUrl.slice(0, 500), targetUrl: targetUrl.slice(0, 500), anchorText: cell(at.anchor).slice(0, 200),
      linkType: rel.includes("sponsored") ? "sponsored" : rel.includes("ugc") ? "ugc" : rel.includes("nofollow") || nofollow ? "nofollow" : "dofollow",
      authority: Number.isFinite(authority) && authority >= 0 && authority <= 100 ? Math.round(authority) : null,
      discoveredAt: when && !Number.isNaN(+when) ? when.toISOString() : "",
    });
  }
  return { rows, skipped };
}
