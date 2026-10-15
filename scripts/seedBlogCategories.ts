// Creates the default blog categories that do not exist yet (matched by slug). Safe to run again: it never changes a
// category that already exists, so edits made in the admin are kept.
// Run: npx tsx scripts/seedBlogCategories.ts
import { prisma } from "@/lib/prisma";
import { DEFAULT_BLOG_CATEGORIES } from "@/lib/blog/defaultCategories";

(async () => {
  const existing = new Set((await prisma.blogCategory.findMany({ select: { slug: true } })).map((c) => c.slug));
  const top = (await prisma.blogCategory.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  let created = 0;
  for (const [i, c] of DEFAULT_BLOG_CATEGORIES.entries()) {
    if (existing.has(c.slug)) continue;
    await prisma.blogCategory.create({ data: { ...c, sortOrder: top + 1 + i, active: true } });
    created++;
  }
  console.log(`Blog categories: ${created} created, ${DEFAULT_BLOG_CATEGORIES.length - created} already existed.`);
  process.exit(0);
})();
