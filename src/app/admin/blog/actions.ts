"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { slugify } from "@/lib/slug";

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
  published: boolean;
};

export type BlogActionResult = { ok: boolean; id?: string; error?: string };

function validate(input: BlogPostFormInput) {
  if (!input.titleEn.trim()) return "English title is required.";
  if (!input.titleAr.trim()) return "Arabic title is required.";
  if (!input.excerptEn.trim()) return "English excerpt is required.";
  if (!input.excerptAr.trim()) return "Arabic excerpt is required.";
  if (!input.contentEn.trim()) return "English content is required.";
  if (!input.contentAr.trim()) return "Arabic content is required.";
  if (!input.slug.trim()) return "Slug is required.";
  return null;
}

export async function createBlogPost(input: BlogPostFormInput): Promise<BlogActionResult> {
  const admin = await requireEmployee("ADMIN");
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
      published: input.published,
      publishedAt: input.published ? new Date() : null,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/blog");
  return { ok: true, id: post.id };
}

export async function updateBlogPost(id: string, input: BlogPostFormInput): Promise<BlogActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Blog post not found." };

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
      published: input.published,
      publishedAt: input.published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      updatedById: admin.id,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}/edit`);
  return { ok: true, id };
}

export async function deleteBlogPost(id: string) {
  await requireEmployee("ADMIN");
  await prisma.blogPost.delete({ where: { id } });
  revalidatePath("/admin/blog");
  redirect("/admin/blog?toast=deleted");
}
