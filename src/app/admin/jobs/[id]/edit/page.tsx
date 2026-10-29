import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { JobForm } from "@/components/jobs/JobForm";
import { areaSuggestions, jobToDto, listCategories } from "@/lib/jobs/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();
  const [categories, areas] = await Promise.all([listCategories(), areaSuggestions()]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · Edit Job" />
      <div className="px-6 py-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">Edit job #{job.number}</h2>
        <JobForm job={jobToDto(job)} categories={categories} areas={areas} />
      </div>
    </div>
  );
}
