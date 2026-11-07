"use server";

import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { BLOCK_REGISTRY, parseBlocks, type BlockType } from "@/lib/cms/blocks";
import { globalIdsIn } from "@/lib/cms/globalBlocks";

export type GlobalActionResult = { ok: boolean; error?: string; id?: string };
const fail = (error: string): GlobalActionResult => ({ ok: false, error });
const MISSING = "Global Blocks are not ready yet: the database update has not been applied.";

export type GlobalBlockRow = { id: string; name: string; type: string; typeLabel: string; updatedAt: string; usedOn: { id: string; title: string }[] };

const labelOf = (type: string) => BLOCK_REGISTRY[type as BlockType]?.label ?? type;

// Which pages use each global block, in their draft or their published version.
async function usageByGlobal(): Promise<Map<string, { id: string; title: string }[]>> {
  const pages = await prisma.cmsPage.findMany({ where: { deletedAt: null }, select: { id: true, titleEn: true, draftBlocks: true, publishedVersion: { select: { blocks: true } } } });
  const usage = new Map<string, { id: string; title: string }[]>();
  for (const p of pages) {
    const ids = new Set([...globalIdsIn(p.draftBlocks), ...globalIdsIn(p.publishedVersion?.blocks)]);
    for (const id of ids) usage.set(id, [...(usage.get(id) ?? []), { id: p.id, title: p.titleEn }]);
  }
  return usage;
}

// For the page builder's picker and the Global Blocks screen.
export async function listGlobalBlocks(): Promise<GlobalBlockRow[]> {
  await requireEmployee("ADMIN");
  const [rows, usage] = await Promise.all([prisma.cmsGlobalBlock.findMany({ orderBy: { name: "asc" } }), usageByGlobal()]);
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, typeLabel: labelOf(r.type), updatedAt: r.updatedAt.toISOString(), usedOn: usage.get(r.id) ?? [] }));
}

export async function getGlobalBlock(id: string): Promise<{ id: string; name: string; type: string; props: Record<string, unknown> } | null> {
  await requireEmployee("ADMIN");
  const g = await prisma.cmsGlobalBlock.findUnique({ where: { id } });
  return g ? { id: g.id, name: g.name, type: g.type, props: g.props as Record<string, unknown> } : null;
}

// "Save as global block": the block's current content becomes a global block. (The caller then swaps the block on the page for
// a link to it, or keeps the page's copy -- that is the page editor's choice.)
export async function createGlobalBlock(block: unknown, name: string): Promise<GlobalActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const clean = name.trim();
  if (!clean || clean.length > 80) return fail("Give the global block a name (up to 80 characters).");
  const parsed = parseBlocks([block]);
  if (!parsed.ok) return fail(parsed.error);
  const b = parsed.blocks[0];
  if (b.type === "global") return fail("A global block cannot be made from a link to another global block.");
  try {
    const row = await prisma.cmsGlobalBlock.create({ data: { name: clean, type: b.type, props: b.props as never, createdById: g.admin.id, updatedById: g.admin.id } });
    await writeAudit(g.admin, "globalblock.create", "CmsGlobalBlock", row.id, null, { name: clean, type: b.type });
    return { ok: true, id: row.id };
  } catch {
    return fail(MISSING);
  }
}

export async function updateGlobalBlock(id: string, name: string, props: unknown): Promise<GlobalActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const clean = name.trim();
  if (!clean || clean.length > 80) return fail("Give the global block a name (up to 80 characters).");
  const existing = await prisma.cmsGlobalBlock.findUnique({ where: { id } });
  if (!existing) return fail("This global block no longer exists.");
  const parsed = parseBlocks([{ id: "global_check", type: existing.type, props, hidden: false, visibility: { desktop: true, mobile: true } }]);
  if (!parsed.ok) return fail(parsed.error);
  await prisma.cmsGlobalBlock.update({ where: { id }, data: { name: clean, props: parsed.blocks[0].props as never, updatedById: g.admin.id } });
  await writeAudit(g.admin, "globalblock.update", "CmsGlobalBlock", id, { name: existing.name }, { name: clean });
  return { ok: true, id };
}

export async function deleteGlobalBlock(id: string): Promise<GlobalActionResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const existing = await prisma.cmsGlobalBlock.findUnique({ where: { id } });
  if (!existing) return fail("This global block no longer exists.");
  const used = (await usageByGlobal()).get(id) ?? [];
  if (used.length > 0) return fail(`Used on ${used.length} page${used.length > 1 ? "s" : ""} (${used.slice(0, 3).map((u) => u.title).join(", ")}${used.length > 3 ? "…" : ""}). Make those blocks independent copies or remove them first.`);
  await prisma.cmsGlobalBlock.delete({ where: { id } });
  await writeAudit(g.admin, "globalblock.delete", "CmsGlobalBlock", id, { name: existing.name, type: existing.type }, null);
  return { ok: true };
}
