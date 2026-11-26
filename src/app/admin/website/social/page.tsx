import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { SocialEditor } from "@/components/cms/SocialEditor";

export default async function SocialPage() {
  await requireEmployee("ADMIN");
  const links = await prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Social Links" />
      <div className="px-6 py-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">Social links</h2>
        <SocialEditor initial={links.map((l) => ({ platform: l.platform, label: l.label, url: l.url, visible: l.visible }))} />
      </div>
    </div>
  );
}
