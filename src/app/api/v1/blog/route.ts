import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, parsePagination, corsPreflight } from "@/lib/apiResponse";

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

  return apiSuccess(posts, { meta: { page, pageSize, total } });
}
