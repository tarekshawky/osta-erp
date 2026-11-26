"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search } from "lucide-react";
import { HeaderUser } from "@/components/admin/HeaderUser";
import { visibleNav } from "@/lib/adminNav";
import { visibleWorkspaces, whereAmI } from "@/lib/controlCenter/workspaces";
import { CommandPalette } from "./CommandPalette";
import { LOOKS } from "./looks";

// The Control Center frame around every website screen: logo, search, the workspace dock, then the screens of the open workspace.
export function ControlCenterShell({ isSuperAdmin, adminSections, bell, children }: { isSuperAdmin: boolean; adminSections: string[]; bell: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const workspaces = useMemo(() => visibleWorkspaces(adminSections, isSuperAdmin), [adminSections, isSuperAdmin]);
  const groups = useMemo(() => visibleNav(adminSections, isSuperAdmin).groups, [adminSections, isSuperAdmin]);
  const here = whereAmI(workspaces, pathname);
  const [searching, setSearching] = useState(false);
  const dock = useRef<HTMLElement>(null);

  // ⌘K / Ctrl+K opens the search from anywhere in the Control Center.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      setSearching((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On a narrow screen the dock scrolls sideways: bring the open workspace into view.
  const openId = here?.workspace.id;
  useEffect(() => {
    const nav = dock.current;
    const item = nav?.querySelector<HTMLElement>("[aria-current]");
    if (nav && item) nav.scrollLeft = item.offsetLeft - (nav.clientWidth - item.offsetWidth) / 2;
  }, [openId]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <Link href="/admin/website" className="order-1 flex items-center gap-2.5" aria-label="Control Center home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6d9bff] to-[#2a50c8] text-white shadow-lg shadow-blue-500/25"><LayoutDashboard size={18} aria-hidden /></span>
          <span className="text-lg font-bold text-[#10163a]">OSTA</span>
        </Link>
        <button type="button" onClick={() => setSearching(true)} className="order-3 flex w-full items-center gap-3 rounded-full bg-white px-5 py-3 text-sm text-[#6b7399] shadow-sm shadow-indigo-900/5 md:order-2 md:mx-auto md:w-full md:max-w-lg md:flex-1">
          <Search size={16} aria-hidden />
          <span className="flex-1 text-left">Search anything…</span>
          <kbd className="font-sans text-xs font-bold text-[#10163a]">⌘ K</kbd>
        </button>
        <div className="order-2 ml-auto flex items-center gap-3 md:order-3 md:ml-0">
          <Link href="/admin" className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#10163a] shadow-sm shadow-indigo-900/5 hover:text-blue-700">← ERP</Link>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#10163a] shadow-sm shadow-indigo-900/5">{bell}</span>
          <HeaderUser />
        </div>
      </header>

      <div className="px-4 pt-4 sm:px-8">
        <nav ref={dock} aria-label="Workspaces" className="relative flex gap-1 overflow-x-auto rounded-3xl bg-white/90 p-2.5 shadow-lg shadow-indigo-900/5 xl:justify-between">
          {workspaces.map((w) => {
            const { icon: Icon, gradient } = LOOKS[w.id];
            const current = w.id === openId;
            return (
              <Link key={w.id} href={w.tabs[0].href} aria-current={current ? "page" : undefined} className={`group flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition ${current ? "bg-white shadow-md shadow-indigo-900/10" : "hover:bg-[#f0f3fd]"}`}>
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md shadow-indigo-900/15 transition group-hover:-translate-y-0.5 ${gradient}`}><Icon size={20} aria-hidden /></span>
                <span className={`text-[11px] font-semibold ${current ? "text-[#10163a]" : "text-[#5b648c]"}`}>{w.label}</span>
              </Link>
            );
          })}
        </nav>
        {here && here.workspace.tabs.length > 1 && (
          <nav aria-label={`${here.workspace.title} screens`} className="mt-4 flex flex-wrap gap-2">
            {here.workspace.tabs.map((t) => (
              <Link key={t.href} href={t.href} aria-current={t.href === here.tab.href ? "page" : undefined} className={`rounded-full px-4 py-2 text-xs font-semibold shadow-sm shadow-indigo-900/5 ${t.href === here.tab.href ? "bg-[#10163a] text-white" : "bg-white text-[#10163a] hover:bg-[#f0f3fd]"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Pages bring their own side padding (24px); this lines them up with the dock. */}
      <main className="min-w-0 sm:px-2">{children}</main>
      {searching && <CommandPalette workspaces={workspaces} groups={groups} onClose={() => setSearching(false)} />}
    </div>
  );
}
