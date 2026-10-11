import { prisma } from "@/lib/prisma";
import { guardPermission } from "@/lib/adminGuard";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { IntegrationsForm } from "@/components/cms/IntegrationsForm";

export default async function IntegrationsPage() {
  const guard = await guardPermission("integrations.manage"); // decides which third parties get visitor data
  if (!guard.ok) {
    return (
      <div className="pb-10"><AdminTopBar title="Website · Integrations" /><p className="px-6 py-6 text-sm text-slate-500">{guard.error}</p></div>
    );
  }
  const s = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Integrations" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Integrations &amp; analytics</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Every integration is optional and the site works with any of them missing. Scripts that track visitors load only after the visitor agrees.</p>
        <IntegrationsForm
          initial={{
            ga4Id: s?.ga4Id ?? "", gtmId: s?.gtmId ?? "", metaPixelId: s?.metaPixelId ?? "", searchConsoleToken: s?.searchConsoleToken ?? "", bingToken: s?.bingToken ?? "",
            requireConsent: s?.requireConsent ?? true, consentTextEn: s?.consentTextEn ?? "", consentTextAr: s?.consentTextAr ?? "", privacyUrl: s?.privacyUrl ?? "",
          }}
        />
      </div>
    </div>
  );
}
