"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { initials } from "@/lib/format";
import { logout } from "@/app/actions/logout";
import { LogoImage } from "@/components/LogoImage";
import { locate, visibleNav, type NavLeaf } from "@/lib/adminNav";
import { overviewLeaf, systemHome, TONES, toneOfSystem } from "@/lib/adminSystems";
import { ModuleIcon } from "./ModuleIcon";

const STORE = "osta-admin-nav";
const FROM = "osta-admin-nav-from";

// The design's sidebar: on the main screen only the Dashboard; inside a system, that system's pages (with a switcher to
// jump to another system). The systems and their pages are the website's own groups -- nothing is added to them.
export function AdminSidebar({
  adminName,
  isSuperAdmin,
  adminSections,
  open,
  onClose,
}: {
  adminName: string;
  isSuperAdmin: boolean;
  adminSections: string[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { groups } = useMemo(() => visibleNav(adminSections, isSuperAdmin), [adminSections, isSuperAdmin]);

  // Remembered between visits: whether the sidebar is the narrow rail (desktop). The system a shared page was opened from
  // is kept for the tab only.
  const [collapsed, setCollapsed] = useState(false);
  const [fromGroup, setFromGroup] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    // Read after mount so the server and first client render agree.
    Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORE) ?? "{}") as { collapsed?: boolean };
        if (typeof saved.collapsed === "boolean") setCollapsed(saved.collapsed);
        setFromGroup(window.sessionStorage.getItem(FROM));
      } catch {
        // Storage blocked or corrupted: start with the defaults.
      }
    });
  }, []);

  const direct = pathname.match(/^\/admin\/systems\/([^/]+)/)?.[1] ?? null;
  const located = locate(groups, pathname, fromGroup);
  const current = groups.find((g) => g.id === (direct ?? located?.groupId)) ?? null;
  const onLauncher = pathname === "/admin";

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORE, JSON.stringify({ collapsed: next }));
    } catch {
      // Not saving is fine.
    }
  }

  function chose(groupId: string) {
    setFromGroup(groupId);
    try {
      window.sessionStorage.setItem(FROM, groupId);
    } catch {
      // ignore
    }
    setSwitching(false);
    onClose();
  }

  const narrow = collapsed; // the desktop rail; on mobile the drawer is always full width
  const itemBase = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
  const active = "bg-[#1e5bd8] text-white shadow-sm";
  const idle = "text-blue-100 hover:bg-white/10";
  const rail = narrow ? "md:justify-center md:px-0" : "";
  const hideNarrow = narrow ? "md:hidden" : "";
  const items: NavLeaf[] = current ? [overviewLeaf(current.id), ...current.items] : [];

  return (
    <aside
      aria-label="Main navigation"
      className={`fixed md:sticky md:top-0 md:h-dvh inset-y-0 left-0 z-30 shrink-0 bg-[#0b2a6b] text-white flex flex-col transition-[transform,width] duration-200 w-72 ${narrow ? "md:w-[4.5rem]" : "md:w-64"} ${
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className={`border-b border-white/10 flex items-center justify-between ${narrow ? "md:px-3 md:py-4 px-6 pt-6 pb-5 md:flex-col md:gap-3" : "px-6 pt-6 pb-5"}`}>
        <div className={narrow ? "md:hidden" : ""}>
          <div className="bg-white rounded-lg px-2.5 py-1.5 inline-block">
            <LogoImage className="h-6 w-auto" />
          </div>
          <div className="text-xs text-blue-200 mt-1.5">Services ERP</div>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={narrow ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={narrow}
          title={narrow ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-blue-200 hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${narrow ? "rotate-180" : ""}`}>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button onClick={onClose} className="md:hidden text-blue-200" aria-label="Close menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1" aria-label="Admin navigation">
        <Link
          href="/admin"
          onClick={onClose}
          aria-current={onLauncher ? "page" : undefined}
          title="Dashboard"
          className={`${itemBase} ${rail} ${onLauncher ? active : idle}`}
        >
          <ModuleIcon name="dashboard" />
          <span className={`flex-1 ${hideNarrow}`}>Dashboard</span>
        </Link>

        {current && (
          <>
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setSwitching((s) => !s)}
                aria-expanded={switching}
                title={current.label}
                className={`flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-left ${rail}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: TONES[toneOfSystem(current.id)].tile, color: TONES[toneOfSystem(current.id)].text }}>
                  <ModuleIcon name={current.icon} size={17} />
                </span>
                <span className={`min-w-0 flex-1 text-sm font-semibold leading-tight ${hideNarrow}`}>{current.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${switching ? "rotate-180" : ""} ${hideNarrow}`} aria-hidden>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {switching && (
                <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl bg-white p-1.5 text-slate-800 shadow-xl">
                  {groups.filter((g) => g.id !== current.id).map((g) => (
                    <li key={g.id}>
                      <Link href={systemHome(g.id)} onClick={() => chose(g.id)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-[#EEF3FC]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: TONES[toneOfSystem(g.id)].tile, color: TONES[toneOfSystem(g.id)].text }}>
                          <ModuleIcon name={g.icon} size={15} />
                        </span>
                        {g.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ul className="mt-2 flex flex-col gap-0.5">
              {items.map((item) => {
                const isActive = item.href === systemHome(current.id) ? pathname === item.href : located?.groupId === current.id && located.href === item.href;
                const inside = isActive && item.children;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => chose(current.id)}
                      aria-current={isActive ? "page" : undefined}
                      title={item.label}
                      className={`${itemBase} ${rail} !py-2 ${isActive ? active : idle}`}
                    >
                      {narrow ? <span className="hidden h-1.5 w-1.5 rounded-full bg-current opacity-70 md:block" /> : null}
                      <span className={`${hideNarrow} text-[13px]`}>{item.label}</span>
                    </Link>
                    {inside && !narrow && (
                      <ul className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                        {item.children!.map((c) => {
                          const cp = c.href.split("?")[0];
                          const cActive = c.href === item.href ? pathname === cp : pathname === cp || pathname.startsWith(`${cp}/`);
                          return (
                            <li key={c.href}>
                              <Link href={c.href} onClick={() => chose(current.id)} className={`block rounded-md px-2.5 py-1.5 text-xs font-medium ${cActive ? "bg-white/15 text-white" : "text-blue-300 hover:bg-white/10"}`}>
                                {c.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* A page that belongs to no system (not expected) still gets a way to every system. */}
        {!current && !onLauncher &&
          groups.map((g) => (
            <Link key={g.id} href={systemHome(g.id)} onClick={() => chose(g.id)} title={g.label} className={`${itemBase} ${rail} ${idle}`}>
              <ModuleIcon name={g.icon} />
              <span className={hideNarrow}>{g.label}</span>
            </Link>
          ))}
      </nav>

      <div className={`px-4 py-4 border-t border-white/10 flex items-center gap-3 ${narrow ? "md:justify-center md:px-2" : ""}`}>
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold" title={adminName}>
          {initials(adminName)}
        </div>
        <div className={`flex-1 min-w-0 ${hideNarrow}`}>
          <div className="text-sm font-medium truncate">{adminName}</div>
          <div className="text-xs text-blue-300">{isSuperAdmin ? "Super Admin" : "Admin"}</div>
        </div>
      </div>
      <form action={logout} className={`px-4 pb-4 ${narrow ? "md:px-2 md:flex md:justify-center" : ""}`}>
        <button className="flex items-center gap-2 text-sm text-blue-200 hover:text-white" title="Logout" aria-label="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={narrow ? "md:hidden" : ""}>Logout</span>
        </button>
      </form>
    </aside>
  );
}
