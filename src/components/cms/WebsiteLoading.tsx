"use client";

import { usePathname } from "next/navigation";
import { LoadingPanel } from "@/components/admin/LoadingPanel";
import { TAB_TITLES, WebsiteTabs } from "./WebsiteTabs";

// Looks like AdminTopBar (which has the jobs bell and so can't be used here): same size and place, so nothing moves when the page arrives.
function Heading({ title }: { title: string }) {
  const month = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date());
  return (
    <header className="bg-gradient-to-r from-blue-950 to-blue-800 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 flex-wrap">
      <h1 className="font-semibold whitespace-nowrap">{title}</h1>
      <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
        <span className="px-3 py-1.5 rounded-full bg-white/10 text-xs sm:text-sm whitespace-nowrap">{month}</span>
        <span className="h-5 w-5 shrink-0" aria-hidden />
      </div>
    </header>
  );
}

// What every Website page looks like while it loads: the same heading and tabs, in the same place, and the spinner only where the
// content will appear. Opening a tab then changes the content, not the whole page.
export function WebsiteChrome({ path }: { path: string }) {
  const isTab = path in TAB_TITLES;
  if (!isTab) return <LoadingPanel />; // an editor or detail page has no tabs
  return (
    <div className="pb-10">
      <Heading title={TAB_TITLES[path]} />
      <div className="px-6 py-6">
        <WebsiteTabs path={path} />
        <LoadingPanel compact />
      </div>
    </div>
  );
}

export function WebsiteLoading() {
  return <WebsiteChrome path={usePathname().replace(/\/$/, "")} />;
}
