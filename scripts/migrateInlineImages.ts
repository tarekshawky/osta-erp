// One-time, opt-in: moves images stored INLINE in content (base64 "data:image/..." text, which bloats every page's HTML)
// into the media library, and swaps the content over to the library URL. Safe to re-run: it only touches data: URLs.
//
//   npx tsx scripts/migrateInlineImages.ts                                       # dry run: reports only, changes nothing
//   npx tsx scripts/migrateInlineImages.ts --apply --origin https://YOUR-ADMIN-DOMAIN
//
// Run --apply only AFTER the admin app with the media library is deployed at that origin, otherwise the new image
// addresses won't exist yet. The origin is the public address of the admin app (the one serving /api/media/...).
import { prisma } from "../src/lib/prisma";
import { processImage } from "../src/lib/media/process";

const apply = process.argv.includes("--apply");
const originArg = process.argv.indexOf("--origin");
const origin = originArg >= 0 ? process.argv[originArg + 1]?.replace(/\/$/, "") : undefined;

type Target = { table: string; id: string; label: string; value: string; save: (url: string) => Promise<unknown> };

async function collect(): Promise<Target[]> {
  const out: Target[] = [];
  const isInline = (v: string | null | undefined): v is string => !!v && /^data:image\/(png|jpe?g|webp|gif|avif);base64,/.test(v);
  for (const b of await prisma.blogPost.findMany({ select: { id: true, titleEn: true, coverImageUrl: true } }))
    if (isInline(b.coverImageUrl)) out.push({ table: "BlogPost", id: b.id, label: b.titleEn, value: b.coverImageUrl, save: (url) => prisma.blogPost.update({ where: { id: b.id }, data: { coverImageUrl: url } }) });
  for (const s of await prisma.servicePage.findMany({ select: { id: true, nameEn: true, coverImageUrl: true } }))
    if (isInline(s.coverImageUrl)) out.push({ table: "ServicePage", id: s.id, label: s.nameEn, value: s.coverImageUrl, save: (url) => prisma.servicePage.update({ where: { id: s.id }, data: { coverImageUrl: url } }) });
  for (const h of await prisma.homeSection.findMany({ select: { id: true, key: true, imageUrl: true } }))
    if (isInline(h.imageUrl)) out.push({ table: "HomeSection", id: h.id, label: h.key, value: h.imageUrl, save: (url) => prisma.homeSection.update({ where: { id: h.id }, data: { imageUrl: url } }) });
  for (const i of await prisma.homeSectionItem.findMany({ select: { id: true, titleEn: true, imageUrl: true } }))
    if (isInline(i.imageUrl)) out.push({ table: "HomeSectionItem", id: i.id, label: i.titleEn, value: i.imageUrl, save: (url) => prisma.homeSectionItem.update({ where: { id: i.id }, data: { imageUrl: url } }) });
  for (const s of await prisma.bookableService.findMany({ select: { id: true, nameEn: true, imageUrl: true } }))
    if (isInline(s.imageUrl)) out.push({ table: "BookableService", id: s.id, label: s.nameEn, value: s.imageUrl, save: (url) => prisma.bookableService.update({ where: { id: s.id }, data: { imageUrl: url } }) });
  return out;
}

async function main() {
  if (apply && (!origin || !/^https:\/\//.test(origin))) {
    console.error("--apply needs --origin https://your-admin-domain (the public address of the admin app).");
    process.exit(1);
  }
  const targets = await collect();
  const totalKb = Math.round(targets.reduce((n, t) => n + t.value.length, 0) / 1024);
  console.log(`${targets.length} inline image(s), ${totalKb} KB of text embedded in page data.`);
  for (const t of targets) console.log(` - ${t.table}: ${t.label} (${Math.round(t.value.length / 1024)} KB)`);
  if (!apply) {
    console.log("\nDry run: nothing was changed. Re-run with --apply --origin https://YOUR-ADMIN-DOMAIN after deploying.");
    return;
  }

  for (const t of targets) {
    const base64 = t.value.slice(t.value.indexOf(",") + 1);
    const processed = await processImage(Buffer.from(base64, "base64"));
    const asset = await prisma.mediaAsset.create({
      data: {
        name: `migrated-${t.table.toLowerCase()}-${t.id.slice(-6)}`, originalName: `${t.table}-${t.id}`, originalMime: "image/jpeg", width: processed.width, height: processed.height,
        originalBytes: Math.round(base64.length * 0.75), uploadedByName: "migration",
        variants: { create: processed.variants.map((v) => ({ width: v.width, height: v.height, format: v.format, bytes: v.bytes, data: new Uint8Array(v.data) })) },
      },
    });
    await t.save(`${origin}/api/media/${asset.id}`);
    console.log(`migrated ${t.table} ${t.label} -> /api/media/${asset.id}`);
  }
}
main().finally(() => prisma.$disconnect());
