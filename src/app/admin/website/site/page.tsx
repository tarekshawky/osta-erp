import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { SiteSettingsForm } from "@/components/cms/SiteSettingsForm";
import type { SettingsInput } from "@/lib/site/siteRules";

export default async function SitePage() {
  await requireEmployee("ADMIN");
  const s = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!s) return <div className="px-6 py-6 text-sm text-slate-500">Run the site seed (scripts/seedSite.ts) to create the settings.</div>;
  const areas = Array.isArray(s.footerAreas) ? (s.footerAreas as { en: string; ar: string }[]) : [];
  const initial: SettingsInput = {
    siteNameEn: s.siteNameEn, siteNameAr: s.siteNameAr, taglineEn: s.taglineEn, taglineAr: s.taglineAr, descriptionEn: s.descriptionEn, descriptionAr: s.descriptionAr,
    logoUrl: s.logoUrl, faviconUrl: s.faviconUrl, defaultLocale: s.defaultLocale, allowIndexing: s.allowIndexing, copyrightEn: s.copyrightEn, copyrightAr: s.copyrightAr,
    phone: s.phone, whatsapp: s.whatsapp, whatsappMessageEn: s.whatsappMessageEn, whatsappMessageAr: s.whatsappMessageAr, email: s.email,
    addressEn: s.addressEn, addressAr: s.addressAr, hoursEn: s.hoursEn, hoursAr: s.hoursAr, mapsUrl: s.mapsUrl, businessProfileUrl: s.businessProfileUrl,
    headerCtaLabelEn: s.headerCtaLabelEn, headerCtaLabelAr: s.headerCtaLabelAr, headerCtaUrl: s.headerCtaUrl, footerAreas: areas,
  };
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Site & Contact" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <SiteSettingsForm initial={initial} />
      </div>
    </div>
  );
}
