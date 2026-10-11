"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { blockingUsages, usagesFor, type Usage } from "@/lib/media/usage";
import { sanitizeFileName } from "@/lib/media/process";

export type ActionResult = { ok: boolean; error?: string };
export type MediaItem = {
  id: string; name: string; width: number; height: number; kb: number; folderId: string | null;
  altEn: string; altAr: string; title: string; caption: string; uploadedBy: string; createdAt: string; usageCount: number;
};
export type FolderItem = { id: string; name: string; count: number };

const fail = (error: string): ActionResult => ({ ok: false, error });
const done = (): ActionResult => {
  revalidatePath("/admin/website/media");
  return { ok: true };
};

// Browsing is open to any admin (editors need it to pick images); changing things needs media.manage.
export async function listMedia(input: { search?: string; folderId?: string | null; unusedOnly?: boolean }): Promise<{ assets: MediaItem[]; folders: FolderItem[] }> {
  await requireEmployee("ADMIN");
  const search = input.search?.trim();
  const where = {
    ...(input.folderId === "none" ? { folderId: null } : input.folderId ? { folderId: input.folderId } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { altEn: { contains: search, mode: "insensitive" as const } }, { altAr: { contains: search } }, { caption: { contains: search, mode: "insensitive" as const } }] } : {}),
  };
  const [rows, folders, counts] = await Promise.all([
    prisma.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, take: 300, include: { variants: { select: { bytes: true, width: true } } } }),
    prisma.mediaFolder.findMany({ orderBy: { name: "asc" } }),
    prisma.mediaAsset.groupBy({ by: ["folderId"], _count: true }),
  ]);
  const usages = await usagesFor(rows.map((r) => r.id));

  let assets: MediaItem[] = rows.map((r) => ({
    id: r.id, name: r.name, width: r.width, height: r.height,
    kb: Math.round(r.variants.reduce((m, v) => (v.width >= m.width ? v : m), r.variants[0] ?? { width: 0, bytes: 0 }).bytes / 1024),
    folderId: r.folderId, altEn: r.altEn, altAr: r.altAr, title: r.title, caption: r.caption,
    uploadedBy: r.uploadedByName ?? "", createdAt: r.createdAt.toISOString().slice(0, 10), usageCount: usages.get(r.id)?.length ?? 0,
  }));
  if (input.unusedOnly) assets = assets.filter((a) => a.usageCount === 0);
  return { assets, folders: folders.map((f) => ({ id: f.id, name: f.name, count: counts.find((c) => c.folderId === f.id)?._count ?? 0 })) };
}

export async function getAssetUsages(id: string): Promise<Usage[]> {
  await requireEmployee("ADMIN");
  return (await usagesFor([id])).get(id) ?? [];
}

export async function updateMedia(id: string, input: { name: string; altEn: string; altAr: string; title: string; caption: string; folderId: string | null }): Promise<ActionResult> {
  const g = await guardPermission("media.manage");
  if (!g.ok) return fail(g.error);
  const before = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!before) return fail("Image not found.");
  if (input.folderId && !(await prisma.mediaFolder.findUnique({ where: { id: input.folderId } }))) return fail("Folder not found.");
  const name = sanitizeFileName(input.name);
  const data = { name, altEn: input.altEn.trim().slice(0, 300), altAr: input.altAr.trim().slice(0, 300), title: input.title.trim().slice(0, 200), caption: input.caption.trim().slice(0, 500), folderId: input.folderId };
  await prisma.mediaAsset.update({ where: { id }, data });
  await writeAudit(g.admin, "media.update", "MediaAsset", id, { name: before.name, altEn: before.altEn, folderId: before.folderId }, { name, altEn: data.altEn, folderId: data.folderId });
  return done();
}

// Refuses while visitors would see a broken image; lists exactly where it is used so it can be swapped first.
export async function deleteMedia(id: string): Promise<ActionResult & { usages?: Usage[] }> {
  const g = await guardPermission("media.manage");
  if (!g.ok) return fail(g.error);
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return fail("Image not found.");
  const usages = (await usagesFor([id])).get(id) ?? [];
  const live = blockingUsages(usages);
  if (live.length) {
    return { ok: false, usages, error: `This image is used in ${live.length} live place${live.length === 1 ? "" : "s"} (${live.slice(0, 3).map((u) => u.label).join(", ")}${live.length > 3 ? "…" : ""}). Replace it there first.` };
  }
  await prisma.mediaAsset.delete({ where: { id } });
  await writeAudit(g.admin, "media.delete", "MediaAsset", id, { name: asset.name, draftUsages: usages.length }, null);
  return { ...done(), usages };
}

export async function createFolder(name: string): Promise<ActionResult> {
  const g = await guardPermission("media.manage");
  if (!g.ok) return fail(g.error);
  const clean = name.trim().slice(0, 60);
  if (!clean) return fail("Folder name is required.");
  if (await prisma.mediaFolder.findUnique({ where: { name: clean } })) return fail("A folder with this name already exists.");
  const folder = await prisma.mediaFolder.create({ data: { name: clean } });
  await writeAudit(g.admin, "media.folder.create", "MediaFolder", folder.id, null, { name: clean });
  return done();
}

export async function renameFolder(id: string, name: string): Promise<ActionResult> {
  const g = await guardPermission("media.manage");
  if (!g.ok) return fail(g.error);
  const clean = name.trim().slice(0, 60);
  if (!clean) return fail("Folder name is required.");
  const clash = await prisma.mediaFolder.findUnique({ where: { name: clean } });
  if (clash && clash.id !== id) return fail("A folder with this name already exists.");
  await prisma.mediaFolder.update({ where: { id }, data: { name: clean } });
  await writeAudit(g.admin, "media.folder.rename", "MediaFolder", id, null, { name: clean });
  return done();
}

export async function deleteFolder(id: string): Promise<ActionResult> {
  const g = await guardPermission("media.manage");
  if (!g.ok) return fail(g.error);
  if ((await prisma.mediaAsset.count({ where: { folderId: id } })) > 0) return fail("Move or delete the images in this folder first.");
  await prisma.mediaFolder.delete({ where: { id } });
  await writeAudit(g.admin, "media.folder.delete", "MediaFolder", id, null, null);
  return done();
}
