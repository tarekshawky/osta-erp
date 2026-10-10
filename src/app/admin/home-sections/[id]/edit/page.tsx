import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { HomeSectionForm } from "@/components/homeSection/HomeSectionForm";
import { labelForKey } from "@/lib/homeSections";
import type { HomeSectionFormInput } from "@/app/admin/home-sections/actions";

export default async function EditHomeSectionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const section = await prisma.homeSection.findUnique({
    where: { id },
    include: { items: { orderBy: { displayOrder: "asc" } } },
  });
  if (!section) notFound();

  const initial: HomeSectionFormInput = {
    headingEn: section.headingEn,
    headingAr: section.headingAr,
    descriptionEn: section.descriptionEn ?? "",
    descriptionAr: section.descriptionAr ?? "",
    imageUrl: section.imageUrl ?? "",
    ctaLabelEn: section.ctaLabelEn ?? "",
    ctaLabelAr: section.ctaLabelAr ?? "",
    ctaUrl: section.ctaUrl ?? "",
    enabled: section.enabled,
    items: section.items.map((item) => ({
      id: item.id,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn ?? "",
      descriptionAr: item.descriptionAr ?? "",
      iconName: item.iconName ?? "",
      imageUrl: item.imageUrl ?? "",
      linkUrl: item.linkUrl ?? "",
      displayOrder: String(item.displayOrder),
    })),
  };

  return (
    <div className="pb-10">
      <AdminTopBar title="Homepage Sections" />
      <div className="px-6 py-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">Edit: {labelForKey(section.key)}</h2>
        <HomeSectionForm id={id} initial={initial} />
      </div>
    </div>
  );
}
