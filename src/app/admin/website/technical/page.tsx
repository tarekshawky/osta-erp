import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { guardPermission } from "@/lib/adminGuard";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { TechnicalFilesManager } from "@/components/cms/TechnicalFilesManager";
import { siteOrigin } from "@/lib/seo/context";
import { isAiPolicy } from "@/lib/site/technicalFiles";

export default async function TechnicalFilesPage() {
  await requireEmployee("ADMIN");
  const [files, site, seo, owner] = await Promise.all([
    prisma.technicalFile.findMany(),
    prisma.siteSettings.findUnique({ where: { id: "default" }, select: { allowIndexing: true } }),
    guardPermission("seo.edit"),
    guardPermission("integrations.manage"),
  ]);
  const by = new Map(files.map((f) => [f.key, f]));
  const policy = by.get("ai-crawlers")?.content;
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Technical Files & AI" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Technical files &amp; AI management</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">The plain-text files that tell search engines, AI assistants and ad networks how to treat your website. They are served from the root of your site.</p>
        <TechnicalFilesManager
          origin={siteOrigin()}
          allowIndexing={site?.allowIndexing ?? true}
          canSeo={seo.ok}
          canOwner={owner.ok}
          initial={{
            aiPolicy: isAiPolicy(policy) ? policy : "allow",
            robotsExtra: by.get("robots")?.content ?? "",
            llms: { enabled: by.get("llms")?.enabled ?? false, content: by.get("llms")?.content ?? "" },
            ads: { enabled: by.get("ads")?.enabled ?? false, content: by.get("ads")?.content ?? "" },
            security: { enabled: by.get("security")?.enabled ?? false, content: by.get("security")?.content ?? "" },
          }}
        />
      </div>
    </div>
  );
}
