"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const TABS = [
  { href: "/admin/website", label: "Overview" },
  { href: "/admin/website/pages", label: "Pages" },
  { href: "/admin/website/structure", label: "Page Structure" },
  { href: "/admin/website/global-blocks", label: "Global Blocks" },
  { href: "/admin/website/forms", label: "Forms & Leads" },
  { href: "/admin/website/integrations", label: "Integrations" },
  { href: "/admin/website/backup", label: "Backup" },
  { href: "/admin/website/seo", label: "SEO" },
  { href: "/admin/website/technical", label: "Technical Files & AI" },
  { href: "/admin/website/code", label: "Header & Footer Code" },
  { href: "/admin/website/page-code", label: "Page Code" },
  { href: "/admin/website/links", label: "Page Links" },
  { href: "/admin/website/backlinks", label: "Backlinks" },
  { href: "/admin/website/areas", label: "Service Areas" },
  { href: "/admin/website/locations", label: "Locations" },
  { href: "/admin/website/redirects", label: "Redirects & Sitemap" },
  { href: "/admin/website/media", label: "Media" },
  { href: "/admin/website/menus", label: "Navigation Menus" },
  { href: "/admin/website/site", label: "Site & Contact" },
  { href: "/admin/website/social", label: "Social Links" },
];

// The heading each tab's page shows, so the loading screen can show the same one.
export const TAB_TITLES: Record<string, string> = {
  "/admin/website": "Website",
  "/admin/website/pages": "Website · Pages",
  "/admin/website/structure": "Website · Page structure",
  "/admin/website/global-blocks": "Website · Global Blocks",
  "/admin/website/forms": "Website · Forms & Leads",
  "/admin/website/integrations": "Website · Integrations",
  "/admin/website/backup": "Website · Backup",
  "/admin/website/seo": "Website · SEO",
  "/admin/website/technical": "Website · Technical Files & AI",
  "/admin/website/code": "Website · Header & Footer Code",
  "/admin/website/page-code": "Website · Page-Level Code",
  "/admin/website/links": "Website · Links",
  "/admin/website/backlinks": "Website · Backlinks",
  "/admin/website/areas": "Website · Service Areas",
  "/admin/website/locations": "Website · Locations",
  "/admin/website/redirects": "Website · Redirects & Sitemap",
  "/admin/website/media": "Website · Media Library",
  "/admin/website/menus": "Website · Menus",
  "/admin/website/site": "Website · Site & Contact",
  "/admin/website/social": "Website · Social Links",
};

export function WebsiteTabs({ path }: { path?: string }) {
  const here = usePathname();
  const pathname = path ?? here;
  // The tab you click lights up at once, while the next page is still loading.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  const active = clicked && clicked.from === pathname ? clicked.href : pathname;
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} onClick={() => setClicked({ href: t.href, from: pathname })} aria-current={active === t.href ? "page" : undefined} className={`rounded-lg px-3.5 py-2 text-sm font-medium ${active === t.href ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
