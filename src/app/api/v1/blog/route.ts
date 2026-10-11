import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, parsePagination, corsPreflight } from "@/lib/apiResponse";
import { publicCoverUrl } from "@/lib/blogCover";

export function OPTIONS() {
  return corsPreflight();
}

const blogListSelect = {
  slug: true,
  titleEn: true,
  titleAr: true,
  excerptEn: true,
  excerptAr: true,
  coverImageUrl: true,
  authorName: true,
  publishedAt: true,
} as const;

// Public, unauthenticated -- the marketing site's blog index.
export async function GET(request: NextRequest) {
  const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
  const where = { published: true };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({ where, select: blogListSelect, orderBy: { publishedAt: "desc" }, skip, take }),
    prisma.blogPost.count({ where }),
  ]);

  const origin = request.nextUrl.origin;
  return apiSuccess(posts.map((p) => ({ ...p, coverImageUrl: publicCoverUrl(origin, p.slug, p.coverImageUrl) })), { meta: { page, pageSize, total } });
}
