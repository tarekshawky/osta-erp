import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CategoriesManager } from "@/components/jobs/CategoriesManager";
import { JobSettingsForm } from "@/components/jobs/JobSettingsForm";
import { getJobSettings, listCategories, seedJobDefaults } from "@/lib/jobs/service";
import { jobsBaseUrl } from "@/lib/jobs/urls";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function JobsSettingsPage() {
  if ((await prisma.jobCategory.count()) === 0) await seedJobDefaults();
  const [settings, categories] = await Promise.all([getJobSettings(), listCategories()]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · Settings" />
      <div className="flex flex-col gap-6 px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="-mt-3 max-w-3xl text-sm text-slate-500">Public job links use <b className="font-mono text-slate-700">{jobsBaseUrl()}/jobs/…</b> (from the <code>PUBLIC_JOBS_BASE_URL</code> setting of the server). Moving to the final domain only needs that value changed.</p>
        <CategoriesManager categories={categories} />
        <JobSettingsForm
          initial={{ minPhotos: settings.minPhotos, maxPhotos: settings.maxPhotos, maxFileMb: settings.maxFileMb, notifyEmail: settings.notifyEmail, notifyRecipients: settings.notifyRecipients, emailDigest: settings.emailDigest, retentionMonths: settings.retentionMonths, skills: settings.skills, areas: settings.areas }}
        />
      </div>
    </div>
  );
}
