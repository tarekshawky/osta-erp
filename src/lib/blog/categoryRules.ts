import { slugify } from "@/lib/slug";

// A category page is only offered to search engines when it holds enough articles to be useful on its own; below this it
// is still reachable for visitors but kept out of the index and the sitemap (thin-page protection).
export const MIN_ARTICLES_FOR_INDEX = 3;

// Addresses a blog article can never use: /blog/category/… belongs to the category pages.
export const RESERVED_BLOG_SLUGS = ["category", "categories", "page"];

export type CategoryInput = {
  slug: string; nameEn: string; nameAr: string; descriptionEn: string; descriptionAr: string;
  seoTitleEn: string; seoTitleAr: string; seoDescriptionEn: string; seoDescriptionAr: string;
  coverImageUrl: string; active: boolean;
};

export function categoryProblem(input: CategoryInput): string | null {
  if (!input.nameEn.trim()) return "English name is required.";
  if (!input.nameAr.trim()) return "Arabic name is required.";
  const slug = slugify(input.slug);
  if (!slug) return "Slug is required (letters, numbers and hyphens).";
  if (RESERVED_BLOG_SLUGS.includes(slug)) return `"${slug}" is reserved. Choose another slug.`;
  if (input.seoTitleEn.length > 120 || input.seoTitleAr.length > 120) return "SEO titles should be under 120 characters.";
  if (input.seoDescriptionEn.length > 320 || input.seoDescriptionAr.length > 320) return "Meta descriptions should be under 320 characters.";
  if (input.coverImageUrl && !/^(\/|https:\/\/)/.test(input.coverImageUrl)) return "The cover image must be an uploaded image or an https:// address.";
  return null;
}

// A slug from the English name that does not clash with `taken`: "ac-tips", then "ac-tips-2", "ac-tips-3"…
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const root = slugify(base) || "category";
  if (!taken.has(root) && !RESERVED_BLOG_SLUGS.includes(root)) return root;
  for (let n = 2; ; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
}
