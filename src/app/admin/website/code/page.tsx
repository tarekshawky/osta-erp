import { prisma } from "@/lib/prisma";
import { guardPermission } from "@/lib/adminGuard";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { CodeForm } from "@/components/cms/CodeForm";
import { saveGlobalCode } from "@/app/admin/website/code-actions";

export default async function GlobalCodePage() {
  const guard = await guardPermission("integrations.manage");
  if (!guard.ok) return <div className="pb-10"><AdminTopBar title="Website · Header & Footer Code" /><p className="px-6 py-6 text-sm text-slate-500">{guard.error}</p></div>;
  const s = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Header & Footer Code" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Global header &amp; footer code</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Code added to every page of the public website. For one page only, use Page-Level Code.</p>
        <CodeForm
          initial={{ headCode: s?.headCode ?? "", headCodeConsent: s?.headCodeConsent ?? "analytics", bodyCode: s?.bodyCode ?? "", bodyCodeConsent: s?.bodyCodeConsent ?? "analytics" }}
          onSave={saveGlobalCode}
          saveLabel="Save global code"
        />
      </div>
    </div>
  );
}
