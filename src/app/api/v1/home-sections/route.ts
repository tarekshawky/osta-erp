import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

const itemSelect = {
  titleEn: true,
  titleAr: true,
  descriptionEn: true,
  descriptionAr: true,
  iconName: true,
  imageUrl: true,
  linkUrl: true,
} as const;

// Public, unauthenticated -- every enabled homepage content block, each with its
// items, keyed by `key` so the marketing site can look up e.g. sections["booking"].
export async function GET() {
  const sections = await prisma.homeSection.findMany({
    where: { enabled: true },
    orderBy: { displayOrder: "asc" },
    select: {
      key: true,
      headingEn: true,
      headingAr: true,
      descriptionEn: true,
      descriptionAr: true,
      imageUrl: true,
      ctaLabelEn: true,
      ctaLabelAr: true,
      ctaUrl: true,
      items: { select: itemSelect, orderBy: { displayOrder: "asc" } },
    },
  });
  return apiSuccess(sections);
}
