import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { readSections, readSeo } from "@/lib/legal/content";
import { Editor } from "./Editor";

export default async function EditLegalDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const doc = await prisma.legalDocument.findUnique({ where: { id } });
  if (!doc) notFound();
  const [categories, others] = await Promise.all([
    prisma.legalCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, key: true, nameEn: true } }),
    prisma.legalDocument.findMany({ orderBy: { number: "asc" }, select: { slug: true, titleEn: true } }),
  ]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Legal Center" />
      <div className="px-6 py-4">
        <h2 className="mb-1 text-xl font-bold text-slate-900">Edit: {doc.titleEn}</h2>
        {doc.status === "ARCHIVED" && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This document is archived, so customers cannot see it. You can edit it here; it stays hidden until you restore it and publish it.</p>}
        <Editor
          id={doc.id} slug={doc.slug} categories={categories} others={others}
          initial={{
            titleEn: doc.titleEn, titleAr: doc.titleAr, summaryEn: doc.summaryEn, summaryAr: doc.summaryAr, introEn: doc.draftIntroEn, introAr: doc.draftIntroAr,
            sections: readSections(doc.draftSections), seo: readSeo(doc.draftSeo), kind: doc.kind, countries: doc.countries, related: doc.related,
            effectiveDate: doc.effectiveDate ? doc.effectiveDate.toISOString().slice(0, 10) : "", categoryId: doc.categoryId,
          }}
        />
      </div>
    </div>
  );
}
