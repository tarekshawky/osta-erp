import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { BacklinkMonitor, type MonitorRow } from "@/components/cms/backlinks/BacklinkMonitor";
import { assessLink, backlinkStats, type PageSignals } from "@/lib/seo/backlinks";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function BacklinksPage() {
  await requireEmployee("ADMIN");
  const [records, scan] = await Promise.all([
    prisma.backlink.findMany({ orderBy: [{ discoveredAt: "desc" }, { createdAt: "desc" }], take: 5000 }),
    prisma.backlinkScan.findFirst({ where: { finishedAt: { not: null } }, orderBy: { startedAt: "desc" } }),
  ]);
  const now = new Date();

  const rows: MonitorRow[] = records.map((b) => {
    const signals = (b.signals ?? null) as PageSignals | null;
    return {
      id: b.id, sourceSite: b.sourceSite, sourceUrl: b.sourceUrl, targetUrl: b.targetUrl, anchorText: b.anchorText, linkType: b.linkType, status: b.status,
      campaign: b.campaign, notes: b.notes, discoveredAt: day(b.discoveredAt), lastCheckedAt: day(b.lastCheckedAt), lastCheckNote: b.lastCheckNote, origin: b.origin,
      decision: b.decision, httpStatus: b.httpStatus, removalRequestedAt: day(b.removalRequestedAt), lostAt: day(b.lostAt), pageTitle: signals?.title ?? "",
      assessment: assessLink({ sourceUrl: b.sourceUrl, anchorText: b.anchorText, linkType: b.linkType, authority: b.authority, signals }),
    };
  });
  const stats = backlinkStats(rows.map((r) => ({ status: r.status, sourceSite: r.sourceSite, discoveredAt: r.discoveredAt, rating: r.assessment.rating })), now);

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Backlink Monitor" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <BacklinkMonitor
          rows={rows} stats={stats} today={day(now)}
          lastScan={scan ? { at: scan.startedAt.toISOString().slice(0, 16).replace("T", " ") + " UTC", summary: `${scan.checked} checked` } : null}
        />
      </div>
    </div>
  );
}
