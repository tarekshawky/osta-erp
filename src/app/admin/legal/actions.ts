"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { SEED_CATEGORIES, SEED_DOCUMENTS, categoryOrder, seedCode, toSections, toSeo } from "@/lib/legal/seed/convert";
import { SEED_FIELDS } from "@/lib/legal/seed";
import type { Prisma } from "@/generated/prisma";

export type LegalResult = { ok: boolean; error?: string; message?: string };

// Adds whatever of the 30 starter documents, their categories and their decision fields is missing. It never changes or replaces anything that already
// exists, so pressing it again (or after editing) is safe.
export async function loadStarterDocuments(): Promise<LegalResult> {
  const g = await guardPermission("legal.edit");
  if (!g.ok) return { ok: false, error: g.error };

  let categories = 0, fields = 0, documents = 0;
  const catId: Record<string, string> = {};
  for (const [i, c] of SEED_CATEGORIES.entries()) {
    const found = await prisma.legalCategory.findUnique({ where: { key: c.key } });
    if (found) { catId[c.key] = found.id; continue; }
    const made = await prisma.legalCategory.create({ data: { key: c.key, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, sortOrder: i } });
    catId[c.key] = made.id; categories += 1;
  }
  for (const f of SEED_FIELDS) {
    const found = await prisma.legalField.findUnique({ where: { key: f.key } });
    if (found) continue;
    await prisma.legalField.create({ data: { ...f, updatedByName: g.admin.name } });
    fields += 1;
  }
  for (const d of SEED_DOCUMENTS) {
    const found = await prisma.legalDocument.findUnique({ where: { slug: d.slug } });
    if (found) continue;
    await prisma.legalDocument.create({
      data: {
        code: seedCode(d.number), number: d.number, slug: d.slug, categoryId: catId[d.cat], status: "DRAFT", kind: d.kind, countries: ["AE"],
        titleEn: d.titleEn, titleAr: d.titleAr, summaryEn: d.summaryEn, summaryAr: d.summaryAr, draftIntroEn: d.introEn, draftIntroAr: d.introAr,
        draftSections: toSections(d) as unknown as Prisma.InputJsonValue, draftSeo: toSeo(d) as unknown as Prisma.InputJsonValue, related: d.related,
        sortOrder: d.number * 10 + categoryOrder(d.cat) * 0, createdById: g.admin.id, createdByName: g.admin.name, updatedByName: g.admin.name,
      },
    });
    documents += 1;
  }
  await writeAudit(g.admin, "legal.starter.load", "LegalDocument", null, null, { categories, fields, documents });
  revalidatePath("/admin/legal");
  return { ok: true, message: documents + fields + categories === 0 ? "Everything was already loaded." : `Loaded ${documents} documents, ${categories} categories and ${fields} decisions to confirm.` };
}

// Saves what the owner decided for one {{field}}. A field only counts once it is confirmed and has both an English and an Arabic value.
export async function saveLegalField(input: { key: string; valueEn: string; valueAr: string; confirmed: boolean }): Promise<LegalResult> {
  const g = await guardPermission("legal.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const before = await prisma.legalField.findUnique({ where: { key: input.key } });
  if (!before) return { ok: false, error: "That decision no longer exists." };
  const valueEn = input.valueEn.trim().slice(0, 500), valueAr = input.valueAr.trim().slice(0, 500);
  if (input.confirmed && (!valueEn || !valueAr)) return { ok: false, error: "Write the value in English and in Arabic before confirming it." };
  await prisma.legalField.update({ where: { key: input.key }, data: { valueEn, valueAr, confirmed: input.confirmed, updatedByName: g.admin.name } });
  await writeAudit(g.admin, "legal.field.save", "LegalField", before.id, { valueEn: before.valueEn, valueAr: before.valueAr, confirmed: before.confirmed }, { valueEn, valueAr, confirmed: input.confirmed });
  revalidatePath("/admin/legal"); revalidatePath("/admin/legal/fields");
  return { ok: true, message: "Saved." };
}
