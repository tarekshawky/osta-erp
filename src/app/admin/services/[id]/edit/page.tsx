import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ServicePageForm } from "@/components/service/ServicePageForm";
import { deleteServicePage, type ServicePageFormInput } from "@/app/admin/services/actions";

export default async function EditServicePagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const service = await prisma.servicePage.findUnique({ where: { id } });
  if (!service) notFound();

  const initial: ServicePageFormInput = {
    slug: service.slug,
    nameEn: service.nameEn,
    nameAr: service.nameAr,
    shortDescriptionEn: service.shortDescriptionEn,
    shortDescriptionAr: service.shortDescriptionAr,
    contentEn: service.contentEn,
    contentAr: service.contentAr,
    iconName: service.iconName ?? "",
    coverImageUrl: service.coverImageUrl ?? "",
    priceFrom: service.priceFrom != null ? String(service.priceFrom) : "",
    priceNote: service.priceNote ?? "",
    seoTitleEn: service.seoTitleEn ?? "",
    seoTitleAr: service.seoTitleAr ?? "",
    seoDescriptionEn: service.seoDescriptionEn ?? "",
    seoDescriptionAr: service.seoDescriptionAr ?? "",
    displayOrder: String(service.displayOrder),
    published: service.published,
  };

  return (
    <div className="pb-10">
      <AdminTopBar title="Services" />
      <div className="px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Edit Service Page</h2>
          <form action={deleteServicePage.bind(null, id)}>
            <button type="submit" className="text-sm font-medium text-red-600">
              Delete
            </button>
          </form>
        </div>
        <ServicePageForm mode="edit" editId={id} initial={initial} />
      </div>
    </div>
  );
}
