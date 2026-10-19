import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { changedRows, layoutProblem, nextSortOrder, type LayoutRow } from "./pageTree";
import { planRedirect } from "./redirectPlan";

type Db = Prisma.TransactionClient | typeof prisma;

// Every live (not deleted) page's place in the tree.
export const livePageTree = (db: Db = prisma) =>
  db.cmsPage.findMany({ where: { deletedAt: null }, select: { id: true, parentId: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

// Saves new parents/positions. Rejects anything that would create a cycle, a missing parent or too deep a tree.
// Only pages whose parent or position really changed are written.
export async function applyPageLayout(layout: readonly LayoutRow[]): Promise<{ ok: true; changed: number } | { ok: false; error: string }> {
  const all = await livePageTree();
  const problem = layoutProblem(all, layout);
  if (problem) return { ok: false, error: problem };
  const merged = all.map((p) => layout.find((l) => l.id === p.id) ?? p);
  const rows = changedRows(all, merged);
  if (rows.length === 0) return { ok: true, changed: 0 };
  await prisma.$transaction(rows.map((r) => prisma.cmsPage.update({ where: { id: r.id }, data: { parentId: r.parentId, sortOrder: r.sortOrder } })));
  return { ok: true, changed: rows.length };
}

// Position for a new page placed last under `parentId`.
export async function nextChildOrder(parentId: string | null, db: Db = prisma): Promise<number> {
  return nextSortOrder(await livePageTree(db), parentId);
}

// When a page is removed, its sub-pages move up to its parent (nothing is orphaned or lost).
export async function reparentChildren(tx: Db, pageId: string, newParentId: string | null) {
  const kids = await tx.cmsPage.findMany({ where: { parentId: pageId, deletedAt: null }, select: { id: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  if (!kids.length) return 0;
  let order = await nextChildOrder(newParentId, tx);
  for (const k of kids) await tx.cmsPage.update({ where: { id: k.id }, data: { parentId: newParentId, sortOrder: order++ } });
  return kids.length;
}

// Applies the redirect plan for an address change inside the given transaction/client.
export async function redirectAddress(db: Db, from: string, to: string) {
  const existing = await db.cmsRedirect.findMany({ where: { OR: [{ fromPath: to }, { toPath: from }] }, select: { fromPath: true, toPath: true } });
  const plan = planRedirect(existing, from, to);
  if (plan.remove.length) await db.cmsRedirect.deleteMany({ where: { fromPath: { in: plan.remove } } });
  for (const r of plan.upsert) await db.cmsRedirect.upsert({ where: { fromPath: r.fromPath }, update: { toPath: r.toPath }, create: r });
  return plan;
}
