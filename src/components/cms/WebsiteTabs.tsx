"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/website", label: "Overview" },
  { href: "/admin/website/pages", label: "Pages" },
  { href: "/admin/website/forms", label: "Forms & Leads" },
  { href: "/admin/website/integrations", label: "Integrations" },
  { href: "/admin/website/seo", label: "SEO" },
  { href: "/admin/website/areas", label: "Service Areas" },
  { href: "/admin/website/redirects", label: "Redirects & Sitemap" },
  { href: "/admin/website/media", label: "Media" },
  { href: "/admin/website/menus", label: "Header & Footer Menus" },
  { href: "/admin/website/site", label: "Site & Contact" },
  { href: "/admin/website/social", label: "Social Links" },
];

export function WebsiteTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`rounded-lg px-3.5 py-2 text-sm font-medium ${pathname === t.href ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
