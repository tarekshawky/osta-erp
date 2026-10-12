import { createHmac, timingSafeEqual } from "crypto";
import { parseBlocks } from "./blocks";

// Slugs that belong to real routes of the public app (or reserved paths). A CMS page can never take them.
export const RESERVED_SLUGS = [
  "about", "blog", "contact", "dashboard", "invoices", "login", "more", "orders", "pricing", "profile",
  "services", "signup", "home", "api", "preview", "admin", "p", "sitemap.xml", "robots.txt", "favicon.ico", "_next",
];

// Built-in pages of the public site that can be replaced by an editable CMS page with the same address. They are
// created only through "Make editable" (never the New page form), and keep their address.
export const BUILT_IN_PAGES = ["about", "contact", "services", "blog", "pricing"] as const;
export const isBuiltInSlug = (slug: string) => (BUILT_IN_PAGES as readonly string[]).includes(slug);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function slugProblem(slug: string, allowBuiltIn = false): string | null {
  if (!slug) return "Slug is required.";
  if (!SLUG_PATTERN.test(slug)) return "Slug can only contain lowercase letters, numbers and single hyphens.";
  if (RESERVED_SLUGS.includes(slug) && !(allowBuiltIn && isBuiltInSlug(slug))) return `"${slug}" is used by an existing page of the site. Choose another slug.`;
  return null;
}

// The public site resolves redirects for single-segment paths (/old-name), which is what page renames create.
export function redirectProblem(from: string, to: string): string | null {
  if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(from)) return "“From” must be a single path like /old-page (lowercase letters, numbers, hyphens).";
  if (RESERVED_SLUGS.includes(from.slice(1))) return `${from} is a real page of the site, so it can't be redirected.`;
  if (!/^(\/|https:\/\/)/.test(to) || to.startsWith("//")) return "“To” must be a site path (/…) or an https:// address.";
  if (to === from) return "A redirect can't point to itself.";
  return null;
}

// Everything that must be true before a page can go live. Pure so it can be unit-tested.
export function publishProblems(page: { slug: string; titleEn: string; titleAr: string; blocks: unknown }, opts: { isHomepage?: boolean } = {}): string[] {
  const problems: string[] = [];
  // The homepage lives at "/", not at its internal slug, so the slug rules don't apply to it.
  const slug = opts.isHomepage ? null : slugProblem(page.slug, true);
  if (slug) problems.push(slug);
  if (!page.titleEn.trim() || !page.titleAr.trim()) problems.push("Both the English and Arabic titles are required.");
  const parsed = parseBlocks(page.blocks);
  if (!parsed.ok) problems.push(parsed.error);
  else if (!parsed.blocks.some((b) => !b.hidden)) problems.push("Add at least one visible block before publishing.");
  return problems;
}

// ---- preview tokens: short-lived, signed, tied to one page ----
const secret = () => process.env.AUTH_SECRET ?? "insecure-dev-secret";
const sign = (pageId: string, exp: number) => createHmac("sha256", secret()).update(`preview:${pageId}.${exp}`).digest("base64url");

export function createPreviewToken(pageId: string, ttlMs = 15 * 60_000, now = Date.now()): string {
  const exp = now + ttlMs;
  return `${exp}.${sign(pageId, exp)}`;
}

export function verifyPreviewToken(pageId: string, token: string, now = Date.now()): boolean {
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!sig || !Number.isFinite(exp) || exp < now) return false;
  const expected = Buffer.from(sign(pageId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
