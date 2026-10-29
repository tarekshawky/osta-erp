import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { JobForm } from "@/components/jobs/JobForm";
import { areaSuggestions, listCategories } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const [categories, areas] = await Promise.all([listCategories({ activeOnly: true }), areaSuggestions()]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · Create Job" />
      <div className="px-6 py-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">Create job</h2>
        <JobForm job={null} categories={categories} areas={areas} />
      </div>
    </div>
  );
}
