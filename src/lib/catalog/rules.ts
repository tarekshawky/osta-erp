import { slugify } from "@/lib/slug";
import { keywordsProblem } from "@/lib/seo/keywords";

export type SeoInput = {
  seoTitleEn: string; seoTitleAr: string; seoDescriptionEn: string; seoDescriptionAr: string; seoKeywordsEn: string; seoKeywordsAr: string; canonicalUrl: string;
};
export type CategoryInput = SeoInput & {
  code: string; slug: string; nameEn: string; nameAr: string; shortDescriptionEn: string; shortDescriptionAr: string; descriptionEn: string; descriptionAr: string;
  iconName: string; imageUrl: string; active: boolean;
};
export type ServiceInput = SeoInput & {
  slug: string; nameEn: string; nameAr: string; shortDescriptionEn: string; shortDescriptionAr: string; descriptionEn: string; descriptionAr: string;
  groupEn: string; groupAr: string; iconName: string; imageUrl: string; gallery: string[]; active: boolean; categoryIds: string[];
};

const seoProblem = (i: SeoInput): string | null => {
  if (i.seoTitleEn.length > 120 || i.seoTitleAr.length > 120) return "SEO titles should be under 120 characters.";
  if (i.seoDescriptionEn.length > 320 || i.seoDescriptionAr.length > 320) return "Meta descriptions should be under 320 characters.";
  if (i.canonicalUrl.trim() && !/^(\/|https:\/\/)/.test(i.canonicalUrl.trim())) return "The canonical URL must start with / or https://.";
  return keywordsProblem(i.seoKeywordsEn, "English keywords") || keywordsProblem(i.seoKeywordsAr, "Arabic keywords");
};
const imageProblem = (url: string) => (url && !/^(\/|https:\/\/)/.test(url) ? "Images must be uploaded images or https:// addresses." : null);

export function categoryProblem(i: CategoryInput): string | null {
  if (!i.nameEn.trim()) return "English name is required.";
  if (!i.nameAr.trim()) return "Arabic name is required.";
  if (!slugify(i.slug)) return "Slug is required (letters, numbers and hyphens).";
  return seoProblem(i) || imageProblem(i.imageUrl);
}

export function serviceProblem(i: ServiceInput): string | null {
  if (!i.nameEn.trim()) return "English name is required.";
  if (!i.nameAr.trim()) return "Arabic name is required.";
  if (!slugify(i.slug)) return "Slug is required (letters, numbers and hyphens).";
  if (i.categoryIds.length === 0) return "Choose at least one category.";
  if (i.gallery.length > 20) return "At most 20 gallery images.";
  return seoProblem(i) || imageProblem(i.imageUrl) || i.gallery.map(imageProblem).find(Boolean) || null;
}

// A slug from a name that does not clash with `taken`: "ac-repair", then "ac-repair-2", "ac-repair-3"…
export function uniqueSlug(base: string, taken: ReadonlySet<string>, fallback = "item"): string {
  const root = slugify(base) || fallback;
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
}

// ---- CSV ----

// RFC-4180 style: quoted fields, doubled quotes, newlines inside quotes, optional BOM, CRLF or LF.
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export const CSV_COLUMNS = [
  "category", "slug", "name_en", "name_ar", "group_en", "group_ar", "short_en", "short_ar", "description_en", "description_ar", "active",
  "seo_title_en", "seo_title_ar", "seo_description_en", "seo_description_ar", "seo_keywords_en", "seo_keywords_ar", "canonical_url", "icon", "image_url",
] as const;

export type ImportRow = Omit<ServiceInput, "categoryIds" | "gallery"> & { categoryRefs: string[]; line: number };
export type ImportIssue = { line: number; message: string };

const yes = (v: string) => /^(1|true|yes|y|active|نعم)$/i.test(v.trim());

// Turns CSV text into import rows. `category` holds one or more categories (slug, code or English name) separated by "|";
// the first is the main one. Only name_en and name_ar and category are required; the slug is made from the English name.
export function parseServicesCsv(text: string): { rows: ImportRow[]; issues: ImportIssue[] } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], issues: [{ line: 1, message: "The file has no data rows." }] };
  const head = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const missing = ["category", "name_en", "name_ar"].filter((c) => col(c) < 0);
  if (missing.length) return { rows: [], issues: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}.` }] };
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  table.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const get = (name: string) => (col(name) >= 0 ? (r[col(name)] ?? "").trim() : "");
    const refs = get("category").split("|").map((x) => x.trim()).filter(Boolean);
    if (!refs.length) return void issues.push({ line, message: "Category is required." });
    const row: ImportRow = {
      line, categoryRefs: refs, slug: get("slug"), nameEn: get("name_en"), nameAr: get("name_ar"), groupEn: get("group_en"), groupAr: get("group_ar"),
      shortDescriptionEn: get("short_en"), shortDescriptionAr: get("short_ar"), descriptionEn: get("description_en"), descriptionAr: get("description_ar"),
      active: col("active") >= 0 ? yes(get("active")) : false,
      seoTitleEn: get("seo_title_en"), seoTitleAr: get("seo_title_ar"), seoDescriptionEn: get("seo_description_en"), seoDescriptionAr: get("seo_description_ar"),
      seoKeywordsEn: get("seo_keywords_en"), seoKeywordsAr: get("seo_keywords_ar"), canonicalUrl: get("canonical_url"), iconName: get("icon"), imageUrl: get("image_url"),
    };
    if (!row.nameEn || !row.nameAr) return void issues.push({ line, message: "English and Arabic names are required." });
    rows.push(row);
  });
  return { rows, issues };
}
