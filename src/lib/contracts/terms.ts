import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CLAUSES, type Clause } from "./clauses";

// The Terms & Conditions an agreement is built from, in versions. A published version is never edited (a change is a new version).

const text = (max: number) => z.string().trim().max(max);
export const ClauseSchema = z.object({
  key: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/),
  titleEn: text(160).min(1), titleAr: text(160).min(1),
  bodyEn: text(6000).min(1), bodyAr: text(6000).min(1),
});
export const ClausesSchema = z.array(ClauseSchema).min(1).max(60).refine((c) => new Set(c.map((x) => x.key)).size === c.length, "Each clause needs its own key.");

export function parseClauses(raw: unknown): Clause[] {
  const r = ClausesSchema.safeParse(raw);
  return r.success ? r.data : [];
}

export type TermsRow = { id: string; groupKey: string; version: number; status: string; clauses: Clause[]; note: string; publishedAt: Date | null; createdAt: Date; createdByName: string };

const toRow = (r: { id: string; groupKey: string; version: number; status: string; clauses: unknown; note: string; publishedAt: Date | null; createdAt: Date; createdByName: string }): TermsRow => ({ ...r, clauses: parseClauses(r.clauses) });

// The default set exists as version 1 the first time anything needs it.
export async function ensureDefaultTerms() {
  const existing = await prisma.contractTerms.findFirst({ where: { groupKey: "", status: "published" }, orderBy: { version: "desc" } });
  if (existing) return existing;
  const any = await prisma.contractTerms.findFirst({ where: { groupKey: "" }, orderBy: { version: "desc" } });
  return prisma.contractTerms.create({
    data: { groupKey: "", version: (any?.version ?? 0) + 1, status: "published", clauses: DEFAULT_CLAUSES as never, note: "Standard Maintenance Service Agreement terms", publishedAt: new Date(), createdByName: "System" },
  });
}

// The version in force for a package page: its own published set, otherwise the default set.
export async function activeTerms(groupKey: string): Promise<{ id: string; version: number; clauses: Clause[] }> {
  if (groupKey) {
    const own = await prisma.contractTerms.findFirst({ where: { groupKey, status: "published" }, orderBy: { version: "desc" } });
    const clauses = own ? parseClauses(own.clauses) : [];
    if (own && clauses.length) return { id: own.id, version: own.version, clauses };
  }
  const base = await ensureDefaultTerms();
  const clauses = parseClauses(base.clauses);
  return { id: base.id, version: base.version, clauses: clauses.length ? clauses : DEFAULT_CLAUSES };
}

export async function listTerms(groupKey: string): Promise<TermsRow[]> {
  if (!groupKey) await ensureDefaultTerms();
  const rows = await prisma.contractTerms.findMany({ where: { groupKey }, orderBy: { version: "desc" }, take: 50 });
  return rows.map(toRow);
}

export async function createDraft(groupKey: string, clauses: Clause[], note: string, admin: { id: string; name: string }) {
  const last = await prisma.contractTerms.findFirst({ where: { groupKey }, orderBy: { version: "desc" } });
  return prisma.contractTerms.create({ data: { groupKey, version: (last?.version ?? 0) + 1, status: "draft", clauses: clauses as never, note: note.trim().slice(0, 300), createdById: admin.id, createdByName: admin.name } });
}

export async function updateDraft(id: string, clauses: Clause[], note: string) {
  const row = await prisma.contractTerms.findUnique({ where: { id } });
  if (!row) return { ok: false as const, error: "This version no longer exists." };
  if (row.status !== "draft") return { ok: false as const, error: "A published version cannot be edited. Create a new version instead." };
  await prisma.contractTerms.update({ where: { id }, data: { clauses: clauses as never, note: note.trim().slice(0, 300) } });
  return { ok: true as const };
}

// Publishing makes this the version new agreements use, and retires the one it replaces (old agreements keep their own copy).
export async function publish(id: string) {
  const row = await prisma.contractTerms.findUnique({ where: { id } });
  if (!row) return { ok: false as const, error: "This version no longer exists." };
  if (row.status !== "draft") return { ok: false as const, error: "Only a draft can be published." };
  if (!parseClauses(row.clauses).length) return { ok: false as const, error: "Add at least one clause before publishing." };
  await prisma.$transaction([
    prisma.contractTerms.updateMany({ where: { groupKey: row.groupKey, status: "published" }, data: { status: "archived" } }),
    prisma.contractTerms.update({ where: { id }, data: { status: "published", publishedAt: new Date() } }),
  ]);
  return { ok: true as const };
}

export async function removeDraft(id: string) {
  const row = await prisma.contractTerms.findUnique({ where: { id } });
  if (!row || row.status !== "draft") return { ok: false as const, error: "Only a draft can be deleted." };
  await prisma.contractTerms.delete({ where: { id } });
  return { ok: true as const };
}
