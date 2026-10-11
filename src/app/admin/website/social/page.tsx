import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { SocialEditor } from "@/components/cms/SocialEditor";

export default async function SocialPage() {
  await requireEmployee("ADMIN");
  const links = await prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Social Links" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <SocialEditor initial={links.map((l) => ({ platform: l.platform, label: l.label, url: l.url, visible: l.visible }))} />
      </div>
    </div>
  );
}
