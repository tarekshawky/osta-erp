"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { HOME_SECTION_KEYS } from "@/lib/homeSections";

export type HomeSectionItemInput = {
  id?: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: string;
  imageUrl: string;
  linkUrl: string;
  displayOrder: string;
};

export type HomeSectionFormInput = {
  headingEn: string;
  headingAr: string;
  descriptionEn: string;
  descriptionAr: string;
  imageUrl: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaUrl: string;
  enabled: boolean;
  items: HomeSectionItemInput[];
};

export type HomeSectionActionResult = { ok: boolean; error?: string };

// Idempotent: guarantees a row exists for every known section key, so the admin
// list always shows all 8 slots even on a database that predates this feature or
// right after a fresh `prisma db push`.
export async function ensureHomeSections() {
  await requireEmployee("ADMIN");
  for (const [index, { key }] of HOME_SECTION_KEYS.entries()) {
    const existing = await prisma.homeSection.findUnique({ where: { key } });
    if (!existing) {
      await prisma.homeSection.create({
        data: { key, headingEn: key, headingAr: key, displayOrder: index },
      });
    }
  }
}

function validate(input: HomeSectionFormInput) {
  if (!input.headingEn.trim()) return "English heading is required.";
  if (!input.headingAr.trim()) return "Arabic heading is required.";
  for (const item of input.items) {
    if (!item.titleEn.trim() || !item.titleAr.trim()) return "Every item needs both an English and Arabic title.";
  }
  return null;
}

export async function updateHomeSection(id: string, input: HomeSectionFormInput): Promise<HomeSectionActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.homeSection.findUnique({ where: { id }, include: { items: true } });
  if (!existing) return { ok: false, error: "Section not found." };

  await prisma.homeSection.update({
    where: { id },
    data: {
      headingEn: input.headingEn.trim(),
      headingAr: input.headingAr.trim(),
      descriptionEn: input.descriptionEn.trim() || null,
      descriptionAr: input.descriptionAr.trim() || null,
      imageUrl: input.imageUrl.trim() || null,
      ctaLabelEn: input.ctaLabelEn.trim() || null,
      ctaLabelAr: input.ctaLabelAr.trim() || null,
      ctaUrl: input.ctaUrl.trim() || null,
      enabled: input.enabled,
      updatedById: admin.id,
    },
  });

  // Replace the item set: delete whatever's no longer present, update existing
  // ones by id, create the rest -- lets one form submission add, edit, and delete
  // items all at once.
  const keptIds = input.items.filter((i) => i.id).map((i) => i.id!);
  const toDelete = existing.items.filter((i) => !keptIds.includes(i.id));
  if (toDelete.length > 0) {
    await prisma.homeSectionItem.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });
  }

  for (const [index, item] of input.items.entries()) {
    const data = {
      sectionId: id,
      titleEn: item.titleEn.trim(),
      titleAr: item.titleAr.trim(),
      descriptionEn: item.descriptionEn.trim() || null,
      descriptionAr: item.descriptionAr.trim() || null,
      iconName: item.iconName.trim() || null,
      imageUrl: item.imageUrl.trim() || null,
      linkUrl: item.linkUrl.trim() || null,
      displayOrder: item.displayOrder ? parseInt(item.displayOrder, 10) || index : index,
    };
    if (item.id) {
      await prisma.homeSectionItem.update({ where: { id: item.id }, data });
    } else {
      await prisma.homeSectionItem.create({ data });
    }
  }

  revalidatePath("/admin/home-sections");
  revalidatePath(`/admin/home-sections/${id}/edit`);
  return { ok: true };
}
