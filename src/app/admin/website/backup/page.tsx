import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { guardPermission } from "@/lib/adminGuard";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { BackupPanel } from "@/components/cms/BackupPanel";

export default async function BackupPage() {
  await requireEmployee("ADMIN");
  const canImport = (await guardPermission("integrations.manage")).ok;
  const [pages, forms] = await Promise.all([prisma.cmsPage.count({ where: { deletedAt: null } }), prisma.cmsForm.count()]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Backup" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Content backup</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Currently {pages} page{pages === 1 ? "" : "s"} and {forms} form{forms === 1 ? "" : "s"}. Use this to keep a copy of your website content, or to move it to another environment.</p>
        <BackupPanel canImport={canImport} />
      </div>
    </div>
  );
}
