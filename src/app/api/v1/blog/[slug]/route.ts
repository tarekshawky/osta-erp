import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

const blogDetailSelect = {
  slug: true,
  titleEn: true,
  titleAr: true,
  excerptEn: true,
  excerptAr: true,
  contentEn: true,
  contentAr: true,
  coverImageUrl: true,
  seoTitleEn: true,
  seoTitleAr: true,
  seoDescriptionEn: true,
  seoDescriptionAr: true,
  authorName: true,
  publishedAt: true,
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({ where: { slug, published: true }, select: blogDetailSelect });
  if (!post) return apiError("not_found", "Blog post not found.", 404);
  return apiSuccess(post);
}
