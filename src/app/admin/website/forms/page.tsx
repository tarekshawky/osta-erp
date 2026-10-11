import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { FormsManager } from "@/components/cms/FormBuilder";
import type { FormField } from "@/lib/forms/forms";

export default async function FormsPage() {
  await requireEmployee("ADMIN");
  const forms = await prisma.cmsForm.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { submissions: true } } } });
  const newCounts = await prisma.cmsFormSubmission.groupBy({ by: ["formId"], where: { status: "NEW" }, _count: true });
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Forms & Leads" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Forms &amp; leads</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Build a form, add it to any page with the “Form” block, and every submission is saved here as a lead. Bots are filtered and each visitor is rate-limited.</p>
        <FormsManager
          forms={forms.map((f) => ({
            id: f.id, slug: f.slug, nameEn: f.nameEn, nameAr: f.nameAr, fields: f.fields as unknown as FormField[], recipients: f.recipients,
            submitLabelEn: f.submitLabelEn, submitLabelAr: f.submitLabelAr, successEn: f.successEn, successAr: f.successAr, active: f.active,
            leads: f._count.submissions, newLeads: newCounts.find((c) => c.formId === f.id)?._count ?? 0,
          }))}
        />
      </div>
    </div>
  );
}
