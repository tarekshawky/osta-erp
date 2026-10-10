"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export type ServicePageFormInput = {
  slug: string;
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  contentEn: string;
  contentAr: string;
  iconName: string;
  coverImageUrl: string;
  priceFrom: string;
  priceNote: string;
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  displayOrder: string;
  published: boolean;
};

export type ServiceActionResult = { ok: boolean; id?: string; error?: string };

function validate(input: ServicePageFormInput) {
  if (!input.nameEn.trim()) return "English name is required.";
  if (!input.nameAr.trim()) return "Arabic name is required.";
  if (!input.shortDescriptionEn.trim()) return "English short description is required.";
  if (!input.shortDescriptionAr.trim()) return "Arabic short description is required.";
  if (!input.contentEn.trim()) return "English content is required.";
  if (!input.contentAr.trim()) return "Arabic content is required.";
  if (!input.slug.trim()) return "Slug is required.";
  if (input.priceFrom && Number.isNaN(Number(input.priceFrom))) return "Price must be a number.";
  return null;
}

function toData(input: ServicePageFormInput) {
  return {
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim(),
    shortDescriptionEn: input.shortDescriptionEn.trim(),
    shortDescriptionAr: input.shortDescriptionAr.trim(),
    contentEn: input.contentEn,
    contentAr: input.contentAr,
    iconName: input.iconName.trim() || null,
    coverImageUrl: input.coverImageUrl.trim() || null,
    priceFrom: input.priceFrom ? Number(input.priceFrom) : null,
    priceNote: input.priceNote.trim() || null,
    seoTitleEn: input.seoTitleEn.trim() || null,
    seoTitleAr: input.seoTitleAr.trim() || null,
    seoDescriptionEn: input.seoDescriptionEn.trim() || null,
    seoDescriptionAr: input.seoDescriptionAr.trim() || null,
    displayOrder: input.displayOrder ? parseInt(input.displayOrder, 10) || 0 : 0,
    published: input.published,
  };
}

export async function createServicePage(input: ServicePageFormInput): Promise<ServiceActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const slug = slugify(input.slug);
  const clash = await prisma.servicePage.findUnique({ where: { slug } });
  if (clash) return { ok: false, error: "A service page with this slug already exists." };

  const service = await prisma.servicePage.create({
    data: { slug, ...toData(input), createdById: admin.id },
  });

  revalidatePath("/admin/services");
  return { ok: true, id: service.id };
}

export async function updateServicePage(id: string, input: ServicePageFormInput): Promise<ServiceActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.servicePage.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Service page not found." };

  const slug = slugify(input.slug);
  if (slug !== existing.slug) {
    const clash = await prisma.servicePage.findUnique({ where: { slug } });
    if (clash) return { ok: false, error: "A service page with this slug already exists." };
  }

  await prisma.servicePage.update({
    where: { id },
    data: { slug, ...toData(input), updatedById: admin.id },
  });

  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}/edit`);
  return { ok: true, id };
}

export async function deleteServicePage(id: string) {
  await requireEmployee("ADMIN");
  await prisma.servicePage.delete({ where: { id } });
  revalidatePath("/admin/services");
  redirect("/admin/services?toast=deleted");
}
