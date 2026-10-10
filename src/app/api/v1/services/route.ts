import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

const serviceListSelect = {
  slug: true,
  nameEn: true,
  nameAr: true,
  shortDescriptionEn: true,
  shortDescriptionAr: true,
  iconName: true,
  coverImageUrl: true,
  priceFrom: true,
  priceNote: true,
} as const;

// Public, unauthenticated -- the marketing site's services index (and pricing page).
export async function GET() {
  const services = await prisma.servicePage.findMany({
    where: { published: true },
    select: serviceListSelect,
    orderBy: { displayOrder: "asc" },
  });
  return apiSuccess(services);
}
