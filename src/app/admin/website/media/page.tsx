import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { MediaLibrary } from "@/components/media/MediaLibrary";

export default async function MediaPage() {
  await requireEmployee("ADMIN");
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Media Library" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Media library</h2>
        <p className="mb-5 text-sm text-slate-500">Images are converted to WebP in several sizes automatically. An image that is live anywhere on the site can&apos;t be deleted until it&apos;s replaced.</p>
        <MediaLibrary />
      </div>
    </div>
  );
}
