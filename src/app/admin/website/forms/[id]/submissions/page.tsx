import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardPermission } from "@/lib/adminGuard";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { LeadsTable } from "@/components/cms/LeadsTable";
import type { FormField } from "@/lib/forms/forms";

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardPermission("leads.view"); // leads hold personal data
  if (!guard.ok) {
    return (
      <div className="pb-10"><AdminTopBar title="Leads" /><p className="px-6 py-6 text-sm text-slate-500">{guard.error}</p></div>
    );
  }
  const form = await prisma.cmsForm.findUnique({ where: { id } });
  if (!form) notFound();
  const fields = form.fields as unknown as FormField[];
  const rows = await prisma.cmsFormSubmission.findMany({ where: { formId: id }, orderBy: { createdAt: "desc" }, take: 500 });

  return (
    <div className="pb-10">
      <AdminTopBar title="Leads" />
      <div className="px-6 py-6">
        <div className="mb-5 flex max-w-4xl items-center justify-between">
          <div>
            <Link href="/admin/website/forms" className="text-sm text-slate-500">← Forms</Link>
            <h2 className="text-2xl font-bold text-slate-900">{form.nameEn} — leads</h2>
          </div>
          <a href={`/admin/website/forms/${id}/export`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Export CSV</a>
        </div>
        <LeadsTable
          leads={rows.map((r) => {
            const data = r.data as Record<string, string | boolean>;
            return {
              id: r.id, at: r.createdAt.toISOString().slice(0, 16).replace("T", " "), status: r.status, notes: r.notes, language: r.language ?? "en", source: r.sourcePath ?? "",
              values: fields.map((f) => ({ label: f.label.en, value: data[f.key] === true ? "Yes" : data[f.key] === false ? "No" : String(data[f.key] ?? "") })),
            };
          })}
        />
      </div>
    </div>
  );
}
