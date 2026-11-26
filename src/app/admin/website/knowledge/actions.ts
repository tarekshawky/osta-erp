"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import type { Permission } from "@/lib/permissions";
import { LIMITS, entryProblems, saveProblem, textChanged, type EntryInput } from "@/lib/knowledge/knowledge";
import { SEED_SECTIONS } from "@/lib/knowledge/seed";
import { PAGE_KEY } from "@/lib/knowledge/publicView";

export type KnowledgeResult = { ok: boolean; error?: string; id?: string };
const fail = (error: string): KnowledgeResult => ({ ok: false, error });
const done = (id?: string): KnowledgeResult => {
  revalidatePath("/admin/website/knowledge");
  return { ok: true, id };
};

// Writing needs "edit pages". Marking an entry as checked is what makes it public, so it needs "publish pages".
const EDIT: Permission = "pages.edit";
const PUBLISH: Permission = "pages.publish";

const clean = (i: EntryInput) => ({
  type: String(i.type), sectionId: String(i.sectionId), titleEn: String(i.titleEn).trim(), titleAr: String(i.titleAr).trim(),
  bodyEn: String(i.bodyEn).trim(), bodyAr: String(i.bodyAr).trim(), sourceUrl: String(i.sourceUrl).trim(),
  visible: !!i.visible, schemaOn: !!i.schemaOn, note: String(i.note).trim(),
});

export async function loadStartingContent(): Promise<KnowledgeResult> {
  const g = await guardPermission(EDIT);
  if (!g.ok) return fail(g.error);
  if (await prisma.knowledgeSection.count()) return fail("The Knowledge Center already has content.");
  await prisma.$transaction(async (tx) => {
    for (const [i, s] of SEED_SECTIONS.entries()) {
      const section = await tx.knowledgeSection.create({ data: { key: s.key, titleEn: s.titleEn, titleAr: s.titleAr, auto: s.auto ?? "", visible: !s.hidden, sortOrder: i } });
      if (s.entries.length) {
        await tx.knowledgeEntry.createMany({
          data: s.entries.map((e, order) => ({ sectionId: section.id, type: e.type, titleEn: e.titleEn, titleAr: e.titleAr, bodyEn: e.bodyEn, bodyAr: e.bodyAr, sourceUrl: e.sourceUrl, note: e.note ?? "", visible: !e.hidden, sortOrder: order })),
        });
      }
    }
  }, { timeout: 30_000 });
  await writeAudit(g.admin, "knowledge.seed", "KnowledgeSection", null, null, { sections: SEED_SECTIONS.length });
  return done();
}

// Opens or closes the public page (and /knowledge.json), and says whether it may be indexed.
export async function setPublicPage(enabled: boolean, indexable: boolean): Promise<KnowledgeResult> {
  const g = await guardPermission(PUBLISH);
  if (!g.ok) return fail(g.error);
  const data = { enabled: !!enabled, content: enabled && indexable ? "index" : "noindex" };
  await prisma.technicalFile.upsert({ where: { key: PAGE_KEY }, update: data, create: { key: PAGE_KEY, ...data } });
  await writeAudit(g.admin, "knowledge.page", "TechnicalFile", PAGE_KEY, null, data);
  return done();
}

export async function saveEntry(id: string | null, input: EntryInput): Promise<KnowledgeResult> {
  const g = await guardPermission(EDIT);
  if (!g.ok) return fail(g.error);
  const data = clean(input);
  const problem = saveProblem(data);
  if (problem) return fail(problem);
  if (!(await prisma.knowledgeSection.findUnique({ where: { id: data.sectionId }, select: { id: true } }))) return fail("That section no longer exists.");

  if (!id) {
    const last = await prisma.knowledgeEntry.findFirst({ where: { sectionId: data.sectionId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const made = await prisma.knowledgeEntry.create({ data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 } });
    await writeAudit(g.admin, "knowledge.entry.create", "KnowledgeEntry", made.id, null, data);
    return done(made.id);
  }
  const before = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!before) return fail("That entry no longer exists.");
  // New text has not been checked by anyone yet.
  const uncheck = textChanged(before, data) ? { verifiedAt: null, verifiedByName: "" } : {};
  await prisma.knowledgeEntry.update({ where: { id }, data: { ...data, ...uncheck } });
  await writeAudit(g.admin, "knowledge.entry.save", "KnowledgeEntry", id, { titleEn: before.titleEn, bodyEn: before.bodyEn, bodyAr: before.bodyAr, sourceUrl: before.sourceUrl, visible: before.visible }, data);
  return done(id);
}

export async function setEntryChecked(id: string, checked: boolean, seenUpdatedAt: string): Promise<KnowledgeResult> {
  const g = await guardPermission(PUBLISH);
  if (!g.ok) return fail(g.error);
  const entry = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!entry) return fail("That entry no longer exists.");
  if (checked) {
    // The check must be about the text the person actually read.
    if (entry.updatedAt.toISOString() !== seenUpdatedAt) return fail("This entry changed since you opened it. Read it again, then mark it as checked.");
    const problems = entryProblems(entry);
    if (problems.length) return fail(problems.join(" "));
  }
  await prisma.knowledgeEntry.update({ where: { id }, data: checked ? { verifiedAt: new Date(), verifiedByName: g.admin.name } : { verifiedAt: null, verifiedByName: "" } });
  await writeAudit(g.admin, checked ? "knowledge.entry.check" : "knowledge.entry.uncheck", "KnowledgeEntry", id, null, { titleEn: entry.titleEn });
  return done(id);
}

export async function deleteEntry(id: string): Promise<KnowledgeResult> {
  const g = await guardPermission(EDIT);
  if (!g.ok) return fail(g.error);
  const before = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!before) return fail("That entry no longer exists.");
  await prisma.knowledgeEntry.delete({ where: { id } });
  await writeAudit(g.admin, "knowledge.entry.delete", "KnowledgeEntry", id, before, null);
  return done();
}

const sectionNames = (titleEn: string, titleAr: string) => {
  const en = String(titleEn).trim(), ar = String(titleAr).trim();
  if (!en || !ar) return { error: "A section needs a name in English and Arabic." } as const;
  if (en.length > LIMITS.section || ar.length > LIMITS.section) return { error: `A section name can be up to ${LIMITS.section} characters.` } as const;
  return { titleEn: en, titleAr: ar } as const;
};

export async function saveSection(id: string | null, titleEn: string, titleAr: string): Promise<KnowledgeResult> {
  const g = await guardPermission(EDIT);
  if (!g.ok) return fail(g.error);
  const names = sectionNames(titleEn, titleAr);
  if ("error" in names) return fail(names.error!);
  if (id) {
    await prisma.knowledgeSection.update({ where: { id }, data: names });
    await writeAudit(g.admin, "knowledge.section.save", "KnowledgeSection", id, null, names);
    return done(id);
  }
  const last = await prisma.knowledgeSection.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const made = await prisma.knowledgeSection.create({ data: { ...names, key: `custom-${crypto.randomUUID()}`, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  await writeAudit(g.admin, "knowledge.section.create", "KnowledgeSection", made.id, null, names);
  return done(made.id);
}

// Showing or hiding a section changes what is public, like checking an entry does.
export async function setSectionVisible(id: string, visible: boolean): Promise<KnowledgeResult> {
  const g = await guardPermission(PUBLISH);
  if (!g.ok) return fail(g.error);
  await prisma.knowledgeSection.update({ where: { id }, data: { visible: !!visible } });
  await writeAudit(g.admin, "knowledge.section.visible", "KnowledgeSection", id, null, { visible: !!visible });
  return done(id);
}

export async function moveSection(id: string, by: -1 | 1): Promise<KnowledgeResult> {
  const g = await guardPermission(EDIT);
  if (!g.ok) return fail(g.error);
  const all = await prisma.knowledgeSection.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const at = all.findIndex((s) => s.id === id);
  const to = at + (by === -1 ? -1 : 1);
  if (at < 0 || to < 0 || to >= all.length) return done(id);
  const order = all.map((s) => s.id);
  [order[at], order[to]] = [order[to], order[at]];
  await prisma.$transaction(order.map((sid, i) => prisma.knowledgeSection.update({ where: { id: sid }, data: { sortOrder: i } })));
  return done(id);
}

export async function deleteSection(id: string): Promise<KnowledgeResult> {
  const g = await guardPermission(EDIT);
  if (!g.ok) return fail(g.error);
  const section = await prisma.knowledgeSection.findUnique({ where: { id }, include: { _count: { select: { entries: true } } } });
  if (!section) return fail("That section no longer exists.");
  if (section.auto) return fail("This section is filled from another screen. Switch it off instead.");
  if (section._count.entries) return fail("Delete or move its entries first.");
  await prisma.knowledgeSection.delete({ where: { id } });
  await writeAudit(g.admin, "knowledge.section.delete", "KnowledgeSection", id, { titleEn: section.titleEn }, null);
  return done();
}
