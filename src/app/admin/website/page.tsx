import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";

const MODULES: { href?: string; title: string; text: string }[] = [
  { href: "/admin/website/pages", title: "Pages", text: "Build pages from blocks, preview, publish or schedule, restore old versions." },
  { href: "/admin/home-sections", title: "Homepage sections", text: "Edit the current homepage content blocks." },
  { href: "/admin/blog", title: "Blog & articles", text: "Write and publish articles." },
  { href: "/admin/services", title: "Website services", text: "Service pages shown on the site." },
  { href: "/admin/website/menus", title: "Header & footer menus", text: "Drag to reorder links, add dropdown sub-items, show or hide per device." },
  { href: "/admin/website/site", title: "Site & contact details", text: "Name, logo, phone, WhatsApp, email, address, header button, footer areas, indexing." },
  { href: "/admin/website/social", title: "Social links", text: "Facebook, Instagram, TikTok and more, shown in the footer." },
  { title: "SEO · GEO · AEO", text: "Coming next." },
  { href: "/admin/website/media", title: "Media library", text: "Upload images, organise in folders, add alt text, see where each one is used." },
  { title: "Integrations & forms", text: "Coming next." },
];

export default async function WebsiteOverviewPage() {
  await requireEmployee("ADMIN");
  const [published, drafts, scheduled] = await Promise.all([
    prisma.cmsPage.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.cmsPage.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.cmsPage.count({ where: { status: "SCHEDULED", deletedAt: null } }),
  ]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Website" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Website management</h2>
        <div className="mb-6 grid max-w-xl grid-cols-3 gap-3">
          {[["Published", published], ["Drafts", drafts], ["Scheduled", scheduled]].map(([label, n]) => (
            <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">{n}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) =>
            m.href ? (
              <Link key={m.title} href={m.href} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400">
                <p className="font-semibold text-slate-900">{m.title}</p>
                <p className="mt-1 text-sm text-slate-500">{m.text}</p>
              </Link>
            ) : (
              <div key={m.title} className="rounded-xl border border-dashed border-slate-200 p-4 opacity-70">
                <p className="font-semibold text-slate-700">{m.title}</p>
                <p className="mt-1 text-sm text-slate-400">{m.text}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
