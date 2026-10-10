import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

const serviceDetailSelect = {
  slug: true,
  nameEn: true,
  nameAr: true,
  shortDescriptionEn: true,
  shortDescriptionAr: true,
  contentEn: true,
  contentAr: true,
  iconName: true,
  coverImageUrl: true,
  priceFrom: true,
  priceNote: true,
  seoTitleEn: true,
  seoTitleAr: true,
  seoDescriptionEn: true,
  seoDescriptionAr: true,
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await prisma.servicePage.findFirst({
    where: { slug, published: true },
    select: serviceDetailSelect,
  });
  if (!service) return apiError("not_found", "Service not found.", 404);
  return apiSuccess(service);
}
