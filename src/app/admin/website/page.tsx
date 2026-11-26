import { Suspense } from "react";
import Link from "next/link";
import { BarChart3, ImageUp, Inbox, LayoutTemplate, Link2Off, PenLine, Plus, Search, FileText, Image as ImageIcon, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { contentDb } from "@/lib/prismaContent";
import { requireEmployee } from "@/lib/auth";
import { leafAllowed } from "@/lib/adminNav";
import { seoReport, type PageSeoRow } from "@/lib/seo/report";
import { attentionItems, attentionSummary, dayLabel, greeting, percent, type AttentionKind } from "@/lib/controlCenter/dashboard";

const CARD = "rounded-3xl bg-white p-6 shadow-lg shadow-indigo-900/5";

const ATTENTION_LOOK: Record<AttentionKind, { icon: LucideIcon; tile: string }> = {
  leads: { icon: Inbox, tile: "bg-[#ff7b86]" },
  tracking: { icon: BarChart3, tile: "bg-[#ff8a8a]" },
  links: { icon: Link2Off, tile: "bg-[#ff9f5f]" },
  title: { icon: Search, tile: "bg-[#4fb4ff]" },
  description: { icon: FileText, tile: "bg-[#8f8cff]" },
  alt: { icon: ImageIcon, tile: "bg-[#ffa766]" },
};

const QUICK: { href: string; label: string; text: string; icon: LucideIcon; gradient: string }[] = [
  { href: "/admin/website/pages", label: "New page", text: "Build it from blocks", icon: LayoutTemplate, gradient: "from-[#ff9f5f] to-[#ea5420]" },
  { href: "/admin/website/media", label: "Upload images", text: "To the media library", icon: ImageUp, gradient: "from-[#ffb978] to-[#f06a35]" },
  { href: "/admin/blog/new", label: "Write a post", text: "New blog article", icon: PenLine, gradient: "from-[#b08cff] to-[#6b3fe4]" },
  { href: "/admin/website/seo", label: "Check SEO", text: "Scores for every page", icon: Search, gradient: "from-[#4fb4ff] to-[#1262d6]" },
];

type SiteData = { newLeads: number; ga4AndGtm: boolean; images: number; imagesWithAlt: number };

// Counts that are quick to read. The media library may live in the second database, so a failure there only hides its numbers.
async function loadSiteData(): Promise<SiteData> {
  const [newLeads, integrations, images, imagesWithAlt] = await Promise.all([
    prisma.cmsFormSubmission.count({ where: { status: "NEW" } }),
    prisma.integrationSettings.findUnique({ where: { id: "default" }, select: { ga4Id: true, gtmId: true } }),
    contentDb.mediaAsset.count().catch(() => 0),
    contentDb.mediaAsset.count({ where: { altEn: { not: "" }, altAr: { not: "" } } }).catch(() => 0),
  ]);
  return { newLeads, ga4AndGtm: !!(integrations?.ga4Id && integrations.gtmId), images, imagesWithAlt };
}

const lacking = (rows: PageSeoRow[], ...ids: string[]) => rows.filter((r) => r.issues.some((i) => ids.includes(i.id))).length;

async function Attention({ report, data, allowed }: { report: Promise<PageSeoRow[]>; data: SiteData; allowed: (href: string) => boolean }) {
  const rows = await report;
  const items = attentionItems({
    newLeads: data.newLeads,
    ga4AndGtm: data.ga4AndGtm,
    brokenLinks: rows.reduce((n, r) => n + r.issues.filter((i) => i.id.startsWith("broken-link-")).length, 0),
    pagesWithoutTitle: lacking(rows, "title-missing-en"),
    pagesWithoutDescription: lacking(rows, "desc-missing-en"),
    imagesWithoutAlt: data.images - data.imagesWithAlt,
  }).filter((i) => allowed(i.href));
  return (
    <>
      <p className="mt-1 text-sm text-white/70">{attentionSummary(items.length)}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item) => {
          const { icon: Icon, tile } = ATTENTION_LOOK[item.kind];
          return (
            <li key={item.kind} className="flex items-center gap-3.5 rounded-2xl bg-white/10 p-3.5">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${tile}`}><Icon size={18} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{item.title}</span>
                <span className="block text-xs text-white/65">{item.detail}</span>
              </span>
              <Link href={item.href} aria-label={`${item.action}: ${item.title}`} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#10163a] hover:bg-blue-50">{item.action}</Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Bar({ label, value, gradient }: { label: string; value: number | null; gradient: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm text-[#10163a]"><span>{label}</span><span className="font-bold">{value === null ? "—" : `${value}%`}</span></div>
      <div className="h-2.5 rounded-full bg-[#eef1fc]"><div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${value ?? 0}%` }} /></div>
    </div>
  );
}

async function Health({ report, data }: { report: Promise<PageSeoRow[]>; data: SiteData }) {
  const rows = await report;
  const score = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : null;
  const arabic = percent(rows.length - lacking(rows, "title-missing-ar", "desc-missing-ar"), rows.length);
  return (
    <div className="mt-4 flex flex-col gap-4">
      <Bar label="Average SEO score" value={score} gradient="from-[#4fb4ff] to-[#2a50c8]" />
      <Bar label="Pages with Arabic SEO title and description" value={arabic} gradient="from-[#ff7ab8] to-[#c02686]" />
      <Bar label="Library images with English and Arabic alt text" value={percent(data.imagesWithAlt, data.images)} gradient="from-[#ffcb47] to-[#e08a00]" />
    </div>
  );
}

function Waiting({ light = false }: { light?: boolean }) {
  return (
    <div role="status" className="mt-4 flex flex-col gap-2.5">
      <span className={`text-sm ${light ? "text-white/70" : "text-[#6b7399]"}`}>Checking every page…</span>
      {[0, 1, 2].map((i) => <span key={i} className={`h-12 animate-pulse rounded-2xl ${light ? "bg-white/10" : "bg-[#eef1fc]"}`} />)}
    </div>
  );
}

function Ring({ value }: { value: number | null }) {
  const around = 2 * Math.PI * 62;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 150 150" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="75" cy="75" r="62" fill="none" stroke="#e9edfb" strokeWidth="15" />
        {!!value && <circle cx="75" cy="75" r="62" fill="none" stroke="#2fd06e" strokeWidth="15" strokeLinecap="round" strokeDasharray={`${(value / 100) * around} ${around}`} />}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-[#10163a]">{value === null ? "—" : `${value}%`}</span>
    </div>
  );
}

export default async function ControlCenterHome() {
  const admin = await requireEmployee("ADMIN");
  const isSuperAdmin = admin.role === "SUPER_ADMIN";
  const allowed = (href: string) => leafAllowed(href, admin.adminSections, isSuperAdmin);
  const [byStatus, recent, data] = await Promise.all([
    prisma.cmsPage.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.cmsPage.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, titleEn: true, titleAr: true, status: true, updatedAt: true } }),
    loadSiteData(),
  ]);
  // Scoring every page takes a while, so the rest of the screen is shown first. Both cards below share this one run.
  const report = seoReport();
  const count = (status: string) => byStatus.find((s) => s.status === status)?._count._all ?? 0;
  const total = byStatus.reduce((n, s) => n + s._count._all, 0);
  const published = count("PUBLISHED");
  const now = new Date();

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-[#10163a]">{greeting(now)}, {admin.name.trim().split(/\s+/)[0]}</h1>
        {allowed("/admin/website/pages") && (
          <Link href="/admin/website/pages" className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4a7dff] to-[#2a50c8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25"><Plus size={16} aria-hidden /> New page</Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="rounded-3xl bg-gradient-to-br from-[#11163d] via-[#1c2768] to-[#2b3fa6] p-6 shadow-lg shadow-indigo-900/15 lg:col-span-3">
          <h2 className="text-lg font-semibold text-white">Needs your attention</h2>
          <Suspense fallback={<Waiting light />}><Attention report={report} data={data} allowed={allowed} /></Suspense>
        </section>
        <section className={`${CARD} flex flex-wrap items-center justify-center gap-6 lg:col-span-2`} aria-label="Published pages">
          <Ring value={percent(published, total)} />
          <div>
            <p className="text-sm text-[#6b7399]">Published pages</p>
            <p className="text-4xl font-bold text-[#10163a]">{published}<span className="text-base text-[#6b7399]"> / {total}</span></p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#10163a]">
              <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#fbb124]" />{count("DRAFT")} {count("DRAFT") === 1 ? "draft" : "drafts"}</span>
              {count("SCHEDULED") > 0 && <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#4fb4ff]" />{count("SCHEDULED")} scheduled</span>}
              {count("ARCHIVED") > 0 && <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#a9b4c8]" />{count("ARCHIVED")} archived</span>}
            </p>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK.filter((q) => allowed(q.href)).map(({ href, label, text, icon: Icon, gradient }) => (
          <Link key={label} href={href} className="flex items-center gap-3.5 rounded-3xl bg-white p-4 shadow-lg shadow-indigo-900/5 transition hover:-translate-y-0.5">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${gradient}`}><Icon size={20} aria-hidden /></span>
            <span><span className="block text-sm font-semibold text-[#10163a]">{label}</span><span className="block text-xs text-[#6b7399]">{text}</span></span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <h2 className="text-sm font-semibold text-[#10163a]">Recently updated</h2>
          <ul className="mt-3 flex flex-col">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/website/pages/${p.id}`} className="flex items-center gap-3 rounded-xl py-2.5 text-sm text-[#10163a] hover:bg-[#f4f6fe]">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.status === "PUBLISHED" ? "bg-[#2fd06e]" : "bg-[#fbb124]"}`} title={p.status.toLowerCase()} />
                  <span className="min-w-0 flex-1 truncate">{p.titleEn || p.titleAr}</span>
                  <span className="shrink-0 text-xs text-[#6b7399]">{dayLabel(p.updatedAt, now)}</span>
                </Link>
              </li>
            ))}
            {!recent.length && <li className="py-3 text-sm text-[#6b7399]">No pages yet.</li>}
          </ul>
        </section>
        <section className={CARD}>
          <h2 className="text-sm font-semibold text-[#10163a]">Site health</h2>
          <Suspense fallback={<Waiting />}><Health report={report} data={data} /></Suspense>
        </section>
      </div>
    </div>
  );
}
