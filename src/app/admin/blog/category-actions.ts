"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { slugify } from "@/lib/slug";
import { normalizeKeywords } from "@/lib/seo/keywords";
import { revalidateSite } from "@/lib/cms/publish";
import { categoryProblem, uniqueSlug, type CategoryInput } from "@/lib/blog/categoryRules";

export type CategoryResult = { ok: boolean; error?: string; id?: string };
export type QuickCategory = { id: string; slug: string; nameEn: string; nameAr: string };

// Public pages list categories, so any change refreshes the blog on the customer site.
async function refresh() {
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/categories");
  await revalidateSite(["blog"]);
}

export async function saveBlogCategory(id: string | null, input: CategoryInput): Promise<CategoryResult> {
  const g = await guardPermission(id ? "pages.edit" : "pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const problem = categoryProblem(input);
  if (problem) return { ok: false, error: problem };
  const slug = slugify(input.slug);
  const clash = await prisma.blogCategory.findUnique({ where: { slug } });
  if (clash && clash.id !== id) return { ok: false, error: "Another category already uses this slug." };

  const data = {
    slug,
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim(),
    descriptionEn: input.descriptionEn.trim(),
    descriptionAr: input.descriptionAr.trim(),
    seoTitleEn: input.seoTitleEn.trim() || null,
    seoTitleAr: input.seoTitleAr.trim() || null,
    seoDescriptionEn: input.seoDescriptionEn.trim() || null,
    seoDescriptionAr: input.seoDescriptionAr.trim() || null,
    seoKeywordsEn: normalizeKeywords(input.seoKeywordsEn),
    seoKeywordsAr: normalizeKeywords(input.seoKeywordsAr),
    coverImageUrl: input.coverImageUrl.trim() || null,
    active: input.active,
  };
  if (id) {
    const before = await prisma.blogCategory.findUnique({ where: { id }, select: { slug: true, nameEn: true, active: true } });
    if (!before) return { ok: false, error: "Category not found." };
    await prisma.blogCategory.update({ where: { id }, data });
    await writeAudit(g.admin, "blogCategory.update", "BlogCategory", id, before, { slug, nameEn: data.nameEn, active: data.active });
    await refresh();
    return { ok: true, id };
  }
  const top = (await prisma.blogCategory.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  const created = await prisma.blogCategory.create({ data: { ...data, sortOrder: top + 1 } });
  await writeAudit(g.admin, "blogCategory.create", "BlogCategory", created.id, null, { slug, nameEn: data.nameEn });
  await refresh();
  return { ok: true, id: created.id };
}

// "+ Create New Category" inside the blog editor: only the two names are needed; everything else can be edited later.
export async function createBlogCategoryQuick(input: { nameEn: string; nameAr: string }): Promise<{ ok: boolean; error?: string; category?: QuickCategory }> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const nameEn = input.nameEn.trim();
  const nameAr = input.nameAr.trim();
  if (!nameEn || !nameAr) return { ok: false, error: "Enter the category name in English and Arabic." };
  const taken = new Set((await prisma.blogCategory.findMany({ select: { slug: true } })).map((c) => c.slug));
  const slug = uniqueSlug(nameEn, taken);
  const top = (await prisma.blogCategory.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  const c = await prisma.blogCategory.create({ data: { slug, nameEn, nameAr, sortOrder: top + 1 } });
  await writeAudit(g.admin, "blogCategory.create", "BlogCategory", c.id, null, { slug, nameEn });
  await refresh();
  return { ok: true, category: { id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr } };
}

export async function moveBlogCategory(id: string, direction: "up" | "down"): Promise<CategoryResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const all = await prisma.blogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true } });
  const i = all.findIndex((c) => c.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  // Rewrite the whole order so equal sort values from older rows can never leave it ambiguous.
  await prisma.$transaction(all.map((c, n) => prisma.blogCategory.update({ where: { id: c.id }, data: { sortOrder: n } })));
  await writeAudit(g.admin, "blogCategory.reorder", "BlogCategory", id, null, { direction });
  await refresh();
  return { ok: true };
}

export async function setBlogCategoryActive(id: string, active: boolean): Promise<CategoryResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  await prisma.blogCategory.update({ where: { id }, data: { active } });
  await writeAudit(g.admin, active ? "blogCategory.activate" : "blogCategory.deactivate", "BlogCategory", id, null, { active });
  await refresh();
  return { ok: true };
}

export async function deleteBlogCategory(id: string): Promise<CategoryResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return { ok: false, error: g.error };
  const c = await prisma.blogCategory.findUnique({ where: { id }, include: { _count: { select: { posts: true, secondaryPosts: true } } } });
  if (!c) return { ok: false, error: "Category not found." };
  const used = c._count.posts + c._count.secondaryPosts;
  if (used > 0) return { ok: false, error: `This category is used by ${used} article${used === 1 ? "" : "s"}. Move them to another category first, or deactivate it instead.` };
  await prisma.blogCategory.delete({ where: { id } });
  await writeAudit(g.admin, "blogCategory.delete", "BlogCategory", id, { slug: c.slug, nameEn: c.nameEn }, null);
  await refresh();
  return { ok: true };
}
