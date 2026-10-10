import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ServicePageForm } from "@/components/service/ServicePageForm";

export default async function NewServicePagePage() {
  await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Services" />
      <div className="px-6 py-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">New Service Page</h2>
        <ServicePageForm mode="create" />
      </div>
    </div>
  );
}
