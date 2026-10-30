// One-time import of the master service catalogue (data/service-catalogue.json): 31 categories and their services, all
// INACTIVE. A service listed in several categories (same English name) becomes ONE service that belongs to each of them.
// Refuses to run when the catalogue already has categories (so edits made in the admin are never overwritten); pass --force
// to run anyway (existing services are matched by slug and updated).
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { runServicesImport } from "../src/lib/catalog/importer";
import { uniqueSlug } from "../src/lib/catalog/rules";
import { toCsv } from "../src/lib/forms/forms";
import { slugify } from "../src/lib/slug";

type Cat = { code: string; nameEn: string; nameAr: string; notice: string; services: { nameEn: string; nameAr: string; groupEn: string | null; groupAr: string | null }[] };

// Same English name and same sub-heading (or none): the same service.
const keyOf = (s: { nameEn: string; groupEn: string | null }) => `${s.nameEn.toLowerCase()}|${s.groupEn ?? ""}`;

async function main() {
  const cats: Cat[] = JSON.parse(readFileSync(new URL("../data/service-catalogue.json", import.meta.url), "utf8"));
  if (process.argv.includes("--reset")) {
    // Only for a catalogue that was just imported and not edited yet.
    await prisma.catalogCategoryService.deleteMany();
    await prisma.catalogService.deleteMany();
    await prisma.catalogCategory.deleteMany();
  }
  if ((await prisma.catalogCategory.count()) > 0 && !process.argv.includes("--force")) throw new Error("The catalogue already has categories. Use --force to run anyway, or --reset to wipe a fresh import first.");

  const taken = new Set<string>();
  const slugs = new Map<string, string>();
  for (const [i, c] of cats.entries()) {
    const slug = uniqueSlug(c.nameEn, taken, "category");
    taken.add(slug);
    slugs.set(c.code, slug);
    const data = { code: c.code, nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.notice, sortOrder: i, active: false };
    await prisma.catalogCategory.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  }

  const merged = new Map<string, { nameEn: string; nameAr: string; groupEn: string | null; groupAr: string | null; cats: string[] }>();
  for (const c of cats) {
    for (const s of c.services) {
      const key = keyOf(s);
      const m = merged.get(key);
      if (m) m.cats.push(slugs.get(c.code)!);
      else merged.set(key, { nameEn: s.nameEn, nameAr: s.nameAr, groupEn: s.groupEn, groupAr: s.groupAr, cats: [slugs.get(c.code)!] });
    }
  }
  const header = ["category", "slug", "name_en", "name_ar", "group_en", "group_ar", "active"];
  const csv = toCsv([header, ...[...merged.values()].map((m) => [m.cats.join("|"), "", m.nameEn, m.nameAr, m.groupEn ?? "", m.groupAr ?? "", "no"])]);
  const r = await runServicesImport(csv);
  console.log({ categories: cats.length, services: merged.size, ...r, issues: r.issues.slice(0, 10) });

  // Each category lists its services in the order of the document (a service shared with an earlier category was created
  // there first, so its position in later categories is set here).
  const rows = await prisma.catalogService.findMany({ select: { id: true, nameEn: true, groupEn: true } });
  const idByKey = new Map(rows.map((x) => [keyOf(x), x.id]));
  for (const c of cats) {
    const categoryId = (await prisma.catalogCategory.findUniqueOrThrow({ where: { slug: slugs.get(c.code)! }, select: { id: true } })).id;
    await prisma.$transaction(
      c.services.map((x, n) => prisma.catalogCategoryService.update({ where: { categoryId_serviceId: { categoryId, serviceId: idByKey.get(keyOf(x))! } }, data: { sortOrder: n } })),
    );
  }
  void slugify;
}
main().finally(() => prisma.$disconnect());
