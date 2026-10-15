import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, parsePagination, corsPreflight } from "@/lib/apiResponse";
import { inCategory, shapeSummary, summarySelect } from "@/lib/blog/publicBlog";

export function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated -- the marketing site's blog index.
//   ?category=<slug>  articles of that category (main or secondary)
//   ?q=<text>         search in titles and excerpts (English and Arabic)
//   ?featured=1       only featured articles
//   ?page=&pageSize=  pagination
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp);
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  const categorySlug = (sp.get("category") ?? "").trim();

  const and: object[] = [];
  if (categorySlug) {
    const cat = await prisma.blogCategory.findFirst({ where: { slug: categorySlug, active: true }, select: { id: true } });
    if (!cat) return apiSuccess([], { meta: { page, pageSize, total: 0 } });
    and.push(inCategory(cat.id));
  }
  if (sp.get("featured") === "1") and.push({ featured: true });
  if (q) {
    and.push({ OR: ["titleEn", "titleAr", "excerptEn", "excerptAr"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) });
  }
  const where = { published: true, ...(and.length ? { AND: and } : {}) };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({ where, select: summarySelect, orderBy: { publishedAt: "desc" }, skip, take }),
    prisma.blogPost.count({ where }),
  ]);

  const origin = request.nextUrl.origin;
  return apiSuccess(posts.map((p) => shapeSummary(p, origin)), { meta: { page, pageSize, total } });
}
