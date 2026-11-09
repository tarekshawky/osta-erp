import { prisma } from "@/lib/prisma";
import { contentDb, contentDbIsSeparate } from "@/lib/prismaContent";

// Moves the media library and the audit log from the main database to the content database (see prisma/content.prisma), from the admin's
// Settings → Content database page, using the app's own database settings (no password is ever typed). Safe to repeat: only rows the content
// database does not have yet are copied, and the main database is only read until "free up" is used on purpose.

export type Counts = { folders: number; assets: number; variants: number; audit: number };
export type ContentStatus = { separate: boolean; main: Counts; content: Counts | null; missing: Counts | null };

const countMain = (): Promise<Counts> =>
  Promise.all([prisma.mediaFolder.count(), prisma.mediaAsset.count(), prisma.mediaVariant.count(), prisma.auditLog.count()]).then(([folders, assets, variants, audit]) => ({ folders, assets, variants, audit }));
const countContent = (): Promise<Counts> =>
  Promise.all([contentDb.mediaFolder.count(), contentDb.mediaAsset.count(), contentDb.mediaVariant.count(), contentDb.auditLog.count()]).then(([folders, assets, variants, audit]) => ({ folders, assets, variants, audit }));

const ids = async (rows: Promise<{ id: string }[]>) => (await rows).map((r) => r.id);
const missingOf = async (main: Promise<{ id: string }[]>, content: Promise<{ id: string }[]>) => {
  const have = new Set(await ids(content));
  return (await ids(main)).filter((id) => !have.has(id));
};
const allMissing = async () => ({
  folders: await missingOf(prisma.mediaFolder.findMany({ select: { id: true } }), contentDb.mediaFolder.findMany({ select: { id: true } })),
  assets: await missingOf(prisma.mediaAsset.findMany({ select: { id: true } }), contentDb.mediaAsset.findMany({ select: { id: true } })),
  variants: await missingOf(prisma.mediaVariant.findMany({ select: { id: true } }), contentDb.mediaVariant.findMany({ select: { id: true } })),
  audit: await missingOf(prisma.auditLog.findMany({ select: { id: true } }), contentDb.auditLog.findMany({ select: { id: true } })),
});

export async function contentStatusNow(): Promise<ContentStatus> {
  const main = await countMain();
  if (!contentDbIsSeparate) return { separate: false, main, content: null, missing: null };
  const [content, miss] = await Promise.all([countContent(), allMissing()]);
  return { separate: true, main, content, missing: { folders: miss.folders.length, assets: miss.assets.length, variants: miss.variants.length, audit: miss.audit.length } };
}

const chunks = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

// Copies what is missing, folders and images first, for up to `budgetMs`; call again until nothing is missing.
export async function copyContent(budgetMs = 40_000): Promise<{ ok: true; copied: Counts; finished: boolean } | { ok: false; error: string }> {
  if (!contentDbIsSeparate) return { ok: false, error: "The content database is not connected yet." };
  const started = Date.now();
  const copied: Counts = { folders: 0, assets: 0, variants: 0, audit: 0 };
  const miss = await allMissing();
  const timeLeft = () => Date.now() - started < budgetMs;

  for (const part of chunks(miss.folders, 500)) {
    if (!timeLeft()) break;
    copied.folders += (await contentDb.mediaFolder.createMany({ data: await prisma.mediaFolder.findMany({ where: { id: { in: part } } }), skipDuplicates: true })).count;
  }
  for (const part of chunks(miss.assets, 200)) {
    if (!timeLeft()) break;
    copied.assets += (await contentDb.mediaAsset.createMany({ data: await prisma.mediaAsset.findMany({ where: { id: { in: part } } }), skipDuplicates: true })).count;
  }
  for (const part of chunks(miss.variants, 8)) {
    if (!timeLeft()) break;
    copied.variants += (await contentDb.mediaVariant.createMany({ data: await prisma.mediaVariant.findMany({ where: { id: { in: part } } }), skipDuplicates: true })).count;
  }
  for (const part of chunks(miss.audit, 500)) {
    if (!timeLeft()) break;
    const rows = await prisma.auditLog.findMany({ where: { id: { in: part } } });
    copied.audit += (await contentDb.auditLog.createMany({ data: rows as never, skipDuplicates: true })).count;
  }
  const left = await allMissing();
  return { ok: true, copied, finished: !left.folders.length && !left.assets.length && !left.variants.length && !left.audit.length };
}

// Empties the four old tables in the main database. Only when every row is already in the content database.
export async function freeUpMainDatabase(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!contentDbIsSeparate) return { ok: false, error: "The content database is not connected, so nothing is emptied." };
  const miss = await allMissing();
  const n = miss.folders.length + miss.assets.length + miss.variants.length + miss.audit.length;
  if (n > 0) return { ok: false, error: `${n} rows are not in the content database yet. Copy first. Nothing was deleted.` };
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "MediaVariant", "MediaAsset", "MediaFolder", "AuditLog"');
  return { ok: true };
}
