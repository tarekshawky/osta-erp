"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { slugify } from "@/lib/slug";
import { parseBlocks, type Block } from "@/lib/cms/blocks";
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
  authorName: string;
  blocks: Block[];
  published: boolean;
};

export type BlogActionResult = { ok: boolean; id?: string; error?: string };

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
  return null;
}

export async function createBlogPost(input: BlogPostFormInput): Promise<BlogActionResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const admin = g.admin;
  if (input.published && !g.can("pages.publish")) return { ok: false, error: "You don't have permission to publish. Save it as a draft." };
  const error = validate(input);
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
      authorName: input.authorName.trim() || null,
      blocks: (input.blocks ?? []) as unknown as Prisma.InputJsonValue,
      published: input.published,
      publishedAt: input.published ? new Date() : null,
      createdById: admin.id,
    },
  });

  await writeAudit(admin, "blog.create", "BlogPost", post.id, null, { slug, published: input.published });
  revalidatePath("/admin/blog");
  return { ok: true, id: post.id };
}

export async function updateBlogPost(id: string, input: BlogPostFormInput): Promise<BlogActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const admin = g.admin;
  const error = validate(input);
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
      authorName: input.authorName.trim() || null,
      blocks: (input.blocks ?? []) as unknown as Prisma.InputJsonValue,
      published: input.published,
      publishedAt: input.published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      updatedById: admin.id,
    },
  });

  await writeAudit(admin, "blog.update", "BlogPost", id, { slug: existing.slug, published: existing.published, titleEn: existing.titleEn }, { slug, published: input.published, titleEn: input.titleEn.trim() });
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}/edit`);
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
