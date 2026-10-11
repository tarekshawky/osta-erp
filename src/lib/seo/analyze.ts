import type { Block } from "@/lib/cms/blocks";

// SEO analyzer for CMS pages. Pure and unit-tested: all site knowledge (other pages' meta, which URLs exist)
// arrives in `ctx`, so the same rules run in the editor, the pages list and the overview report.
export type Severity = "error" | "warn" | "info";
export type SeoIssue = { id: string; severity: Severity; message: string };

export type SeoFields = {
  titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string;
  canonical: string; noindex: boolean; ogImage: string; focusKeyword?: string; secondaryKeywords?: string;
};

export type SeoPageInput = {
  slug: string; type: string; titleEn: string; titleAr: string; showInSitemap: boolean; blocks: Block[]; seo: SeoFields;
};

export type OtherMeta = { label: string; titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string };
export type SeoContext = { others: OtherMeta[]; knownPaths: Set<string> };

export const TITLE_MAX = 60;
export const TITLE_MIN = 15;
export const DESC_MAX = 160;
export const DESC_MIN = 70;

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const bi = (v: unknown): { en: string; ar: string } => {
  const o = (v ?? {}) as { en?: string; ar?: string };
  return { en: o.en ?? "", ar: o.ar ?? "" };
};
const visible = (blocks: Block[]) => blocks.filter((b) => !b.hidden && (b.visibility.desktop || b.visibility.mobile));

// Every `url` field in the blocks (button links), whatever the block type.
export function collectLinks(blocks: Block[]): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (k === "url" && typeof val === "string" && val.trim()) out.push(val.trim());
        else walk(val);
      }
    }
  };
  visible(blocks).forEach((b) => walk(b.props));
  return out;
}

export function brokenInternalLinks(links: string[], knownPaths: Set<string>): string[] {
  const broken = new Set<string>();
  for (const link of links) {
    if (!link.startsWith("/") || link.startsWith("//")) continue; // external, tel:, mailto: are not checked here
    const path = link.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    if (!knownPaths.has(path)) broken.add(link);
  }
  return [...broken];
}

function wordCount(blocks: Block[]): number {
  let text = "";
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.en === "string" && typeof o.ar === "string") text += ` ${o.en}`;
      else Object.values(o).forEach(walk);
    }
  };
  visible(blocks).forEach((b) => walk(b.props));
  return text.split(/\s+/).filter(Boolean).length;
}

export function analyzePage(page: SeoPageInput, ctx: SeoContext): { score: number; issues: SeoIssue[] } {
  const issues: SeoIssue[] = [];
  const add = (id: string, severity: Severity, message: string) => issues.push({ id, severity, message });
  const seo = page.seo;
  const blocks = visible(page.blocks);

  // --- titles & descriptions (both languages) ---
  for (const [lang, title, desc, fallback] of [
    ["English", seo.titleEn, seo.descriptionEn, page.titleEn],
    ["Arabic", seo.titleAr, seo.descriptionAr, page.titleAr],
  ] as const) {
    const code = lang === "English" ? "en" : "ar";
    const t = title.trim();
    if (!t) add(`title-missing-${code}`, "warn", `${lang} SEO title is empty — the page title "${fallback.trim()}" is used instead.`);
    else if (t.length > TITLE_MAX) add(`title-long-${code}`, "warn", `${lang} SEO title is ${t.length} characters; Google shows about ${TITLE_MAX}.`);
    else if (t.length < TITLE_MIN) add(`title-short-${code}`, "warn", `${lang} SEO title is very short (${t.length} characters).`);
    const d = desc.trim();
    if (!d) add(`desc-missing-${code}`, "warn", `${lang} meta description is missing.`);
    else if (d.length > DESC_MAX) add(`desc-long-${code}`, "warn", `${lang} meta description is ${d.length} characters; Google shows about ${DESC_MAX}.`);
    else if (d.length < DESC_MIN) add(`desc-short-${code}`, "info", `${lang} meta description is short (${d.length} characters); ${DESC_MIN}–${DESC_MAX} works best.`);
  }

  // --- headings: the hero heading is the page's single H1 ---
  const heroes = blocks.filter((b) => b.type === "hero" && bi(b.props.heading).en.trim());
  if (heroes.length === 0) add("h1-missing", "warn", "No H1: add a Hero block with a heading so the page has a main title.");
  if (heroes.length > 1) add("h1-multiple", "error", `${heroes.length} Hero blocks have a heading, so the page has ${heroes.length} H1s. Keep one.`);
  const firstHeadingIdx = blocks.findIndex((b) => bi(b.props.heading).en.trim());
  if (firstHeadingIdx >= 0 && blocks[firstHeadingIdx].type !== "hero" && heroes.length > 0) {
    add("h1-order", "info", "A section heading (H2) comes before the H1. Put the Hero first so headings read in order.");
  }

  // --- images ---
  for (const b of blocks) {
    if (b.type === "imageText" && b.props.imageUrl) {
      const alt = bi(b.props.imageAlt);
      if (!alt.en.trim() || !alt.ar.trim()) add(`alt-missing-${b.id}`, "warn", "An Image + text block has an image without alt text in both languages.");
    }
  }
  if (!seo.ogImage.trim()) add("og-image", "info", "No social share image: links shared on WhatsApp/Facebook show without a picture.");

  // --- links ---
  const broken = brokenInternalLinks(collectLinks(page.blocks), ctx.knownPaths);
  for (const link of broken) add(`broken-link-${link}`, "error", `Broken internal link: ${link} does not exist on the site.`);

  // --- duplicates across the site ---
  const dupChecks: [string, string, (o: OtherMeta) => string | undefined][] = [
    [seo.titleEn, "English SEO title", (o) => o.titleEn],
    [seo.titleAr, "Arabic SEO title", (o) => o.titleAr],
    [seo.descriptionEn, "English meta description", (o) => o.descriptionEn],
    [seo.descriptionAr, "Arabic meta description", (o) => o.descriptionAr],
  ];
  for (const [value, label, pick] of dupChecks) {
    if (!norm(value)) continue;
    const clash = ctx.others.find((o) => norm(pick(o)) === norm(value));
    if (clash) add(`dup-${label}`, "warn", `${label} is identical to "${clash.label}". Search engines prefer unique text on every page.`);
  }

  // --- indexing & canonical ---
  if (seo.noindex && page.showInSitemap) add("noindex-sitemap", "warn", "Page is hidden from search engines but still listed in the sitemap. Turn one of them off.");
  if (seo.canonical.trim() && !/^(\/|https:\/\/)/.test(seo.canonical.trim())) add("canonical-invalid", "error", "Canonical URL must be a site path or an https:// address.");
  if (page.slug.length > 60) add("slug-long", "info", "The URL is long. Shorter URLs are easier to read and share.");

  // --- content & keywords ---
  const words = wordCount(page.blocks);
  if (words < 100) add("thin-content", "warn", `Only about ${words} words of English text. Thin pages rarely rank; aim for 150+.`);
  const focus = norm(seo.focusKeyword);
  if (focus) {
    if (!norm(seo.titleEn || page.titleEn).includes(focus)) add("kw-title", "warn", `The focus keyword "${seo.focusKeyword}" is not in the English SEO title.`);
    if (!norm(seo.descriptionEn).includes(focus)) add("kw-desc", "info", `The focus keyword is not in the English meta description.`);
    const h1 = norm(bi(heroes[0]?.props.heading).en);
    if (heroes.length && !h1.includes(focus)) add("kw-h1", "info", "The focus keyword is not in the H1 heading.");
  }

  const penalty = { error: 20, warn: 8, info: 2 } as const;
  const score = Math.max(0, 100 - issues.reduce((sum, i) => sum + penalty[i.severity], 0));
  return { score, issues };
}
