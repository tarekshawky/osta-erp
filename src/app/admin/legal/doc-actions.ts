"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { slugify } from "@/lib/slug";
import { COUNTRIES, DOC_KINDS, buildSnapshot, publishProblems, readSeo, readSections, type DocKind, type FieldValue } from "@/lib/legal/content";
import type { Prisma } from "@/generated/prisma";

export type DocResult = { ok: boolean; error?: string; message?: string; id?: string; problems?: string[] };
const json = (v: unknown) => v as Prisma.InputJsonValue;
const touch = (id?: string) => { revalidatePath("/admin/legal"); if (id) { revalidatePath(`/admin/legal/${id}`); revalidatePath(`/admin/legal/${id}/edit`); } };

export type DraftInput = {
  titleEn: string; titleAr: string; summaryEn: string; summaryAr: string; introEn: string; introAr: string;
  sections: unknown; seo: unknown; kind: string; countries: string[]; related: string[]; effectiveDate: string; categoryId: string;
};

const text = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

// Saves the working draft. The published text is never touched: only Publish creates a new version.
export async function saveLegalDraft(id: string, input: DraftInput): Promise<DocResult> {
  const g = await guardPermission("legal.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const doc = await prisma.legalDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "This document no longer exists." };
  if (doc.status === "ARCHIVED") return { ok: false, error: "This document is archived. Restore it before editing." };
  const titleEn = text(input.titleEn, 200), titleAr = text(input.titleAr, 200);
  if (!titleEn || !titleAr) return { ok: false, error: "Both the English and the Arabic title are required." };
  const kind: DocKind = (DOC_KINDS as readonly string[]).includes(input.kind) ? (input.kind as DocKind) : "POLICY";
  const allowed = new Set<string>(COUNTRIES.map((c) => c.code));
  const countries = [...new Set((input.countries ?? []).filter((c) => allowed.has(c)))];
  if (!countries.length) return { ok: false, error: "Choose at least one country." };
  const category = await prisma.legalCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) return { ok: false, error: "Choose a category." };
  const known = new Set((await prisma.legalDocument.findMany({ select: { slug: true } })).map((d) => d.slug));
  const related = [...new Set((input.related ?? []).filter((s) => known.has(s) && s !== doc.slug))].slice(0, 12);
  const effective = input.effectiveDate ? new Date(`${input.effectiveDate}T00:00:00.000Z`) : null;
  if (effective && Number.isNaN(effective.getTime())) return { ok: false, error: "The effective date is not a valid date." };
  const sections = readSections(input.sections);
  await prisma.legalDocument.update({
    where: { id },
    data: {
      titleEn, titleAr, summaryEn: text(input.summaryEn, 600), summaryAr: text(input.summaryAr, 600), draftIntroEn: text(input.introEn, 20000), draftIntroAr: text(input.introAr, 20000),
      draftSections: json(sections), draftSeo: json(readSeo(input.seo)), kind, countries, related, effectiveDate: effective, categoryId: category.id, updatedByName: g.admin.name,
    },
  });
  await writeAudit(g.admin, "legal.document.save", "LegalDocument", id, null, { sections: sections.length, titleEn });
  touch(id);
  return { ok: true, message: "Draft saved. Customers still see the last published version." };
}

async function fieldMap(): Promise<Record<string, FieldValue>> {
  const rows = await prisma.legalField.findMany();
  return Object.fromEntries(rows.map((f) => [f.key, { valueEn: f.valueEn, valueAr: f.valueAr, confirmed: f.confirmed }]));
}

// Turns the draft into a new, permanent version and makes it the one customers see.
export async function publishLegalDocument(id: string, changeNote: string): Promise<DocResult> {
  const g = await guardPermission("legal.publish");
  if (!g.ok) return { ok: false, error: g.error };
  const doc = await prisma.legalDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "This document no longer exists." };
  if (doc.status === "ARCHIVED") return { ok: false, error: "This document is archived. Restore it first." };
  if (doc.kind === "INTERNAL") return { ok: false, error: "Internal procedures are never published to customers." };
  const note = text(changeNote, 500);
  if (!note) return { ok: false, error: "Describe what changed (it is kept in the version history)." };
  const draft = { titleEn: doc.titleEn, titleAr: doc.titleAr, summaryEn: doc.summaryEn, summaryAr: doc.summaryAr, draftIntroEn: doc.draftIntroEn, draftIntroAr: doc.draftIntroAr, sections: readSections(doc.draftSections), seo: readSeo(doc.draftSeo) };
  const fields = await fieldMap();
  const problems = publishProblems(draft, fields);
  if (problems.length) return { ok: false, error: "This document is not ready to publish yet.", problems };
  const snap = buildSnapshot(draft, fields);
  const last = await prisma.legalDocumentVersion.findFirst({ where: { documentId: id }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (last?.version ?? 0) + 1;
  const effective = doc.effectiveDate ?? new Date();
  await prisma.$transaction(async (tx) => {
    const v = await tx.legalDocumentVersion.create({
      data: { documentId: id, version, kind: "PUBLISH", titleEn: snap.titleEn, titleAr: snap.titleAr, summaryEn: snap.summaryEn, summaryAr: snap.summaryAr, introEn: snap.introEn, introAr: snap.introAr, sections: json(snap.sections), seo: json(snap.seo), effectiveDate: effective, changeNote: note, editorName: doc.updatedByName ?? "", approverName: g.admin.name },
    });
    await tx.legalDocument.update({ where: { id }, data: { status: "PUBLISHED", publishedVersionId: v.id, effectiveDate: effective } });
  });
  await writeAudit(g.admin, "legal.document.publish", "LegalDocument", id, null, { version, note });
  touch(id);
  return { ok: true, message: `Published as version ${version}.` };
}

// Archived documents disappear for customers but keep every version. Restoring brings back the last published version (or the draft).
export async function archiveLegalDocument(id: string): Promise<DocResult> {
  const g = await guardPermission("legal.publish");
  if (!g.ok) return { ok: false, error: g.error };
  const doc = await prisma.legalDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "This document no longer exists." };
  await prisma.legalDocument.update({ where: { id }, data: { status: "ARCHIVED" } });
  await writeAudit(g.admin, "legal.document.archive", "LegalDocument", id, { status: doc.status }, { status: "ARCHIVED" });
  touch(id);
  return { ok: true, message: "Archived. Its history is kept." };
}

export async function restoreLegalDocument(id: string): Promise<DocResult> {
  const g = await guardPermission("legal.publish");
  if (!g.ok) return { ok: false, error: g.error };
  const doc = await prisma.legalDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "This document no longer exists." };
  const status = doc.publishedVersionId ? "PUBLISHED" : "DRAFT";
  await prisma.legalDocument.update({ where: { id }, data: { status } });
  await writeAudit(g.admin, "legal.document.restore", "LegalDocument", id, { status: doc.status }, { status });
  touch(id);
  return { ok: true, message: status === "PUBLISHED" ? "Restored. The last published version is live again." : "Restored as a draft." };
}

// Only a document that was never published can be deleted. Anything that was ever published is archived instead, so its record stays.
export async function deleteLegalDraft(id: string): Promise<DocResult> {
  const g = await guardPermission("legal.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const doc = await prisma.legalDocument.findUnique({ where: { id }, include: { _count: { select: { versions: true } } } });
  if (!doc) return { ok: false, error: "This document no longer exists." };
  if (doc._count.versions > 0 || doc.publishedVersionId) return { ok: false, error: "This document has been published, so it can only be archived. Published versions are never deleted." };
  await prisma.legalDocument.delete({ where: { id } });
  await writeAudit(g.admin, "legal.document.delete", "LegalDocument", id, { slug: doc.slug, titleEn: doc.titleEn }, null);
  touch();
  return { ok: true, message: "Draft deleted." };
}

export async function duplicateLegalDocument(id: string): Promise<DocResult> {
  const g = await guardPermission("legal.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const doc = await prisma.legalDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "This document no longer exists." };
  let slug = `${doc.slug}-copy`; let n = 2;
  while (await prisma.legalDocument.findUnique({ where: { slug } })) slug = `${doc.slug}-copy-${n++}`;
  const top = await prisma.legalDocument.aggregate({ _max: { number: true } });
  const number = (top._max.number ?? 0) + 1;
  const made = await prisma.legalDocument.create({
    data: {
      code: `OSTA-LEG-${String(number).padStart(3, "0")}`, number, slug, categoryId: doc.categoryId, status: "DRAFT", kind: doc.kind, countries: doc.countries,
      titleEn: `${doc.titleEn} (copy)`, titleAr: `${doc.titleAr} (نسخة)`, summaryEn: doc.summaryEn, summaryAr: doc.summaryAr, draftIntroEn: doc.draftIntroEn, draftIntroAr: doc.draftIntroAr,
      draftSections: json(doc.draftSections), draftSeo: json(doc.draftSeo), related: doc.related, sortOrder: number * 10, createdById: g.admin.id, createdByName: g.admin.name, updatedByName: g.admin.name,
    },
  });
  await writeAudit(g.admin, "legal.document.duplicate", "LegalDocument", made.id, { from: id }, { slug });
  touch(made.id);
  return { ok: true, id: made.id, message: "Duplicated as a new draft." };
}

export async function createLegalDocument(input: { categoryId: string; slug: string; titleEn: string; titleAr: string }): Promise<DocResult> {
  const g = await guardPermission("legal.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const titleEn = text(input.titleEn, 200), titleAr = text(input.titleAr, 200);
  if (!titleEn || !titleAr) return { ok: false, error: "Both the English and the Arabic title are required." };
  const slug = slugify(input.slug || titleEn);
  if (!slug) return { ok: false, error: "The address (slug) is required." };
  if (await prisma.legalDocument.findUnique({ where: { slug } })) return { ok: false, error: "A document with this address already exists." };
  const category = await prisma.legalCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) return { ok: false, error: "Choose a category." };
  const top = await prisma.legalDocument.aggregate({ _max: { number: true } });
  const number = (top._max.number ?? 0) + 1;
  const made = await prisma.legalDocument.create({
    data: {
      code: `OSTA-LEG-${String(number).padStart(3, "0")}`, number, slug, categoryId: category.id, status: "DRAFT", kind: "POLICY", countries: ["AE"], titleEn, titleAr,
      draftSections: json([{ id: "s1", level: 2, headingEn: "", headingAr: "", bodyEn: "", bodyAr: "" }]), sortOrder: number * 10, createdById: g.admin.id, createdByName: g.admin.name, updatedByName: g.admin.name,
    },
  });
  await writeAudit(g.admin, "legal.document.create", "LegalDocument", made.id, null, { slug, titleEn });
  touch(made.id);
  return { ok: true, id: made.id, message: "Created as a draft." };
}

// Puts an old published version back into the draft (the published history is never changed). It still has to be reviewed and published again.
export async function restoreVersionAsDraft(id: string, version: number): Promise<DocResult> {
  const g = await guardPermission("legal.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const doc = await prisma.legalDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "This document no longer exists." };
  if (doc.status === "ARCHIVED") return { ok: false, error: "This document is archived. Restore it before editing." };
  const v = await prisma.legalDocumentVersion.findUnique({ where: { documentId_version: { documentId: id, version } } });
  if (!v) return { ok: false, error: "That version no longer exists." };
  await prisma.legalDocument.update({ where: { id }, data: { titleEn: v.titleEn, titleAr: v.titleAr, summaryEn: v.summaryEn, summaryAr: v.summaryAr, draftIntroEn: v.introEn, draftIntroAr: v.introAr, draftSections: json(v.sections), draftSeo: json(v.seo), updatedByName: g.admin.name } });
  await writeAudit(g.admin, "legal.document.restoreVersion", "LegalDocument", id, null, { version });
  touch(id);
  return { ok: true, message: `Version ${version} is now the draft. Review it and publish to make it live.` };
}
