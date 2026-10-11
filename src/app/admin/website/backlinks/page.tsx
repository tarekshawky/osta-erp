import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { BacklinksManager } from "@/components/cms/BacklinksManager";

export default async function BacklinksPage() {
  await requireEmployee("ADMIN");
  const rows = await prisma.backlink.findMany({ orderBy: { discoveredAt: "desc" }, take: 1000 });
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Backlinks" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Backlinks</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">
          A record of other websites that link to yours. This is for tracking only — nothing here creates, buys or requests links. “Check link” opens the other page and confirms the link is still there.
        </p>
        <BacklinksManager rows={rows.map((b) => ({
          id: b.id, sourceSite: b.sourceSite, sourceUrl: b.sourceUrl, targetUrl: b.targetUrl, anchorText: b.anchorText, linkType: b.linkType, status: b.status,
          campaign: b.campaign, notes: b.notes, discoveredAt: b.discoveredAt.toISOString().slice(0, 10),
          lastCheckedAt: b.lastCheckedAt ? b.lastCheckedAt.toISOString().slice(0, 10) : "", lastCheckNote: b.lastCheckNote,
        }))} />
      </div>
    </div>
  );
}
