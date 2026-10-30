import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { normalizeKeywords } from "@/lib/seo/keywords";
import { parseServicesCsv, serviceProblem, uniqueSlug } from "./rules";

export type ImportSummary = { ok: boolean; error?: string; created: number; updated: number; issues: { line: number; message: string }[] };

export const MAX_IMPORT_ROWS = 3000;
const chunks = <T,>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

// Adds new services and updates existing ones (matched by slug) from CSV text. Categories are never created here: an unknown
// category is reported and that row is skipped. Nothing is deleted. Works in a few batched queries so ~1000 rows stay fast.
export async function runServicesImport(text: string): Promise<ImportSummary> {
  const fail = (error: string, issues: ImportSummary["issues"] = []): ImportSummary => ({ ok: false, error, created: 0, updated: 0, issues });
  if (text.length > 4_000_000) return fail("The file is too large (4 MB at most).");
  const { rows, issues } = parseServicesCsv(text);
  if (rows.length > MAX_IMPORT_ROWS) return fail(`At most ${MAX_IMPORT_ROWS} services per file.`);
  if (!rows.length) return fail("Nothing to import.", issues);

  const cats = await prisma.catalogCategory.findMany({ select: { id: true, slug: true, code: true, nameEn: true } });
  const byRef = new Map<string, string>();
  for (const c of cats) for (const k of [c.slug, c.code ?? "", c.nameEn]) if (k) byRef.set(k.trim().toLowerCase(), c.id);
  const existing = new Map((await prisma.catalogService.findMany({ select: { id: true, slug: true } })).map((s) => [s.slug, s.id]));
  const taken = new Set(existing.keys());

  const valid: { slug: string; row: (typeof rows)[number]; categoryIds: string[] }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const ids: string[] = [];
    let bad: string | null = null;
    for (const ref of row.categoryRefs) {
      const id = byRef.get(ref.toLowerCase());
      if (!id) { bad = `Unknown category "${ref}".`; break; }
      if (!ids.includes(id)) ids.push(id);
    }
    if (bad) { issues.push({ line: row.line, message: bad }); continue; }
    // A slug given in the file updates that service; otherwise a new one is made from the English name.
    const given = slugify(row.slug);
    const slug = given || uniqueSlug(row.nameEn, new Set([...taken, ...seen]), "service");
    if (seen.has(slug)) { issues.push({ line: row.line, message: `The slug "${slug}" appears twice in the file.` }); continue; }
    const problem = serviceProblem({ ...row, slug, gallery: [], categoryIds: ids });
    if (problem) { issues.push({ line: row.line, message: problem }); continue; }
    seen.add(slug);
    valid.push({ slug, row, categoryIds: ids });
  }

  const dataOf = ({ slug, row }: (typeof valid)[number]) => ({
    slug, nameEn: row.nameEn, nameAr: row.nameAr, shortDescriptionEn: row.shortDescriptionEn, shortDescriptionAr: row.shortDescriptionAr,
    descriptionEn: row.descriptionEn, descriptionAr: row.descriptionAr, groupEn: row.groupEn || null, groupAr: row.groupAr || null,
    iconName: row.iconName || null, imageUrl: row.imageUrl || null, active: row.active,
    seoTitleEn: row.seoTitleEn || null, seoTitleAr: row.seoTitleAr || null, seoDescriptionEn: row.seoDescriptionEn || null, seoDescriptionAr: row.seoDescriptionAr || null,
    seoKeywordsEn: normalizeKeywords(row.seoKeywordsEn), seoKeywordsAr: normalizeKeywords(row.seoKeywordsAr), canonicalUrl: row.canonicalUrl || null,
  });

  const fresh = valid.filter((v) => !existing.has(v.slug));
  const changed = valid.filter((v) => existing.has(v.slug));
  for (const part of chunks(fresh, 500)) await prisma.catalogService.createMany({ data: part.map(dataOf), skipDuplicates: true });
  for (const part of chunks(changed, 50)) await prisma.$transaction(part.map((v) => prisma.catalogService.update({ where: { id: existing.get(v.slug)! }, data: dataOf(v) })));

  // Category links: the file's list of categories is the service's list. New links go to the end of each category, in file order.
  const idBySlug = new Map((await prisma.catalogService.findMany({ where: { slug: { in: valid.map((v) => v.slug) } }, select: { id: true, slug: true } })).map((s) => [s.slug, s.id]));
  const links = await prisma.catalogCategoryService.findMany({ where: { serviceId: { in: [...idBySlug.values()] } }, select: { categoryId: true, serviceId: true } });
  const have = new Set(links.map((l) => `${l.categoryId}|${l.serviceId}`));
  const next = new Map<string, number>();
  for (const g of await prisma.catalogCategoryService.groupBy({ by: ["categoryId"], _max: { sortOrder: true } })) next.set(g.categoryId, (g._max.sortOrder ?? -1) + 1);
  const add: { categoryId: string; serviceId: string; sortOrder: number }[] = [];
  const drop: { categoryId: string; serviceId: string }[] = [];
  for (const v of valid) {
    const serviceId = idBySlug.get(v.slug);
    if (!serviceId) continue;
    for (const categoryId of v.categoryIds) {
      if (have.has(`${categoryId}|${serviceId}`)) continue;
      const n = next.get(categoryId) ?? 0;
      next.set(categoryId, n + 1);
      add.push({ categoryId, serviceId, sortOrder: n });
    }
    for (const l of links) if (l.serviceId === serviceId && !v.categoryIds.includes(l.categoryId)) drop.push(l);
  }
  for (const part of chunks(drop, 200)) await prisma.catalogCategoryService.deleteMany({ where: { OR: part } });
  for (const part of chunks(add, 1000)) await prisma.catalogCategoryService.createMany({ data: part, skipDuplicates: true });

  return { ok: true, created: fresh.length, updated: changed.length, issues: issues.sort((a, b) => a.line - b.line) };
}
