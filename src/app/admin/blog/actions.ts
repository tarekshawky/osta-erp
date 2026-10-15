"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { slugify } from "@/lib/slug";
import { keywordsProblem, normalizeKeywords } from "@/lib/seo/keywords";
import { parseBlocks, type Block } from "@/lib/cms/blocks";
import { RESERVED_BLOG_SLUGS } from "@/lib/blog/categoryRules";
import { revalidateSite } from "@/lib/cms/publish";
import type { Prisma } from "@/generated/prisma";

export type BlogPostFormInput = {
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  contentEn: string;
  contentAr: string;
  coverImageUrl: string;
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  seoKeywordsEn: string;
  seoKeywordsAr: string;
  authorName: string;
  blocks: Block[];
  categoryId: string;
  secondaryCategoryIds: string[];
  featured: boolean;
  published: boolean;
};

export type BlogActionResult = { ok: boolean; id?: string; error?: string };

async function categoryProblem(input: BlogPostFormInput): Promise<string | null> {
  if (!input.categoryId) return "Choose a category for this article.";
  const ids = [input.categoryId, ...(input.secondaryCategoryIds ?? [])];
  const found = await prisma.blogCategory.count({ where: { id: { in: ids } } });
  if (found !== new Set(ids).size) return "One of the selected categories no longer exists. Reload the page and choose again.";
  return null;
}

function validate(input: BlogPostFormInput) {
  if (!input.titleEn.trim()) return "English title is required.";
  if (!input.titleAr.trim()) return "Arabic title is required.";
  if (!input.excerptEn.trim()) return "English excerpt is required.";
  if (!input.excerptAr.trim()) return "Arabic excerpt is required.";
  const parsed = parseBlocks(input.blocks ?? []);
  if (!parsed.ok) return parsed.error;
  // The article body is either the blocks or the plain text below; one of them must have content.
  const hasBlocks = parsed.blocks.some((b) => !b.hidden);
  if (!hasBlocks && !input.contentEn.trim()) return "Add English content, or at least one block.";
  if (!hasBlocks && !input.contentAr.trim()) return "Add Arabic content, or at least one block.";
  if (!input.slug.trim()) return "Slug is required.";
  const kw = keywordsProblem(input.seoKeywordsEn, "English keywords") ?? keywordsProblem(input.seoKeywordsAr, "Arabic keywords");
  if (kw) return kw;
  if (RESERVED_BLOG_SLUGS.includes(slugify(input.slug))) return `"${slugify(input.slug)}" is reserved for the blog category pages. Choose another slug.`;
  return null;
}

export async function createBlogPost(input: BlogPostFormInput): Promise<BlogActionResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const admin = g.admin;
  if (input.published && !g.can("pages.publish")) return { ok: false, error: "You don't have permission to publish. Save it as a draft." };
  const error = validate(input) ?? (await categoryProblem(input));
  if (error) return { ok: false, error };

  const slug = slugify(input.slug);
  const clash = await prisma.blogPost.findUnique({ where: { slug } });
  if (clash) return { ok: false, error: "A blog post with this slug already exists." };

  const post = await prisma.blogPost.create({
    data: {
      slug,
      titleEn: input.titleEn.trim(),
      titleAr: input.titleAr.trim(),
      excerptEn: input.excerptEn.trim(),
      excerptAr: input.excerptAr.trim(),
      contentEn: input.contentEn,
      contentAr: input.contentAr,
      coverImageUrl: input.coverImageUrl.trim() || null,
      seoTitleEn: input.seoTitleEn.trim() || null,
      seoTitleAr: input.seoTitleAr.trim() || null,
      seoDescriptionEn: input.seoDescriptionEn.trim() || null,
      seoDescriptionAr: input.seoDescriptionAr.trim() || null,
      seoKeywordsEn: normalizeKeywords(input.seoKeywordsEn),
      seoKeywordsAr: normalizeKeywords(input.seoKeywordsAr),
      authorName: input.authorName.trim() || null,
      blocks: (input.blocks ?? []) as unknown as Prisma.InputJsonValue,
      categoryId: input.categoryId,
      secondaryCategories: { connect: [...new Set(input.secondaryCategoryIds ?? [])].filter((id) => id !== input.categoryId).map((id) => ({ id })) },
      featured: input.featured,
      published: input.published,
      publishedAt: input.published ? new Date() : null,
      createdById: admin.id,
    },
  });

  await writeAudit(admin, "blog.create", "BlogPost", post.id, null, { slug, published: input.published });
  revalidatePath("/admin/blog");
  await revalidateSite(["blog"]);
  return { ok: true, id: post.id };
}

export async function updateBlogPost(id: string, input: BlogPostFormInput): Promise<BlogActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const admin = g.admin;
  const error = validate(input) ?? (await categoryProblem(input));
  if (error) return { ok: false, error };

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Blog post not found." };

  if (input.published !== existing.published && !g.can("pages.publish")) {
    return { ok: false, error: "You don't have permission to publish or unpublish." };
  }

  const slug = slugify(input.slug);
  if (slug !== existing.slug) {
    const clash = await prisma.blogPost.findUnique({ where: { slug } });
    if (clash) return { ok: false, error: "A blog post with this slug already exists." };
  }

  await prisma.blogPost.update({
    where: { id },
    data: {
      slug,
      titleEn: input.titleEn.trim(),
      titleAr: input.titleAr.trim(),
      excerptEn: input.excerptEn.trim(),
      excerptAr: input.excerptAr.trim(),
      contentEn: input.contentEn,
      contentAr: input.contentAr,
      coverImageUrl: input.coverImageUrl.trim() || null,
      seoTitleEn: input.seoTitleEn.trim() || null,
      seoTitleAr: input.seoTitleAr.trim() || null,
      seoDescriptionEn: input.seoDescriptionEn.trim() || null,
      seoDescriptionAr: input.seoDescriptionAr.trim() || null,
      seoKeywordsEn: normalizeKeywords(input.seoKeywordsEn),
      seoKeywordsAr: normalizeKeywords(input.seoKeywordsAr),
      authorName: input.authorName.trim() || null,
      blocks: (input.blocks ?? []) as unknown as Prisma.InputJsonValue,
      categoryId: input.categoryId,
      secondaryCategories: { set: [...new Set(input.secondaryCategoryIds ?? [])].filter((id) => id !== input.categoryId).map((id) => ({ id })) },
      featured: input.featured,
      published: input.published,
      publishedAt: input.published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      updatedById: admin.id,
    },
  });

  await writeAudit(admin, "blog.update", "BlogPost", id, { slug: existing.slug, published: existing.published, titleEn: existing.titleEn }, { slug, published: input.published, titleEn: input.titleEn.trim() });
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}/edit`);
  await revalidateSite(["blog"]);
  return { ok: true, id };
}

export async function deleteBlogPost(id: string) {
  const g = await guardPermission("pages.delete");
  if (!g.ok) redirect("/admin/blog?toast=forbidden");
  const before = await prisma.blogPost.findUnique({ where: { id }, select: { slug: true, titleEn: true } });
  await prisma.blogPost.delete({ where: { id } });
  await writeAudit(g.admin, "blog.delete", "BlogPost", id, before, null);
  revalidatePath("/admin/blog");
  redirect("/admin/blog?toast=deleted");
}
