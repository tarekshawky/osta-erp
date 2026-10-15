"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initials } from "@/lib/format";
import { logout } from "@/app/actions/logout";
import { LogoImage } from "@/components/LogoImage";
import { DASHBOARD, locate, searchNav, visibleNav, type NavGroup, type NavIcon } from "@/lib/adminNav";

const ICONS: Record<NavIcon, ReactNode> = {
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  orders: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  hr: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M15.5 14.2c2.5.4 4.5 2.7 4.5 5.8" strokeLinecap="round" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9v.01M18 15v.01" strokeLinecap="round" />
    </>
  ),
  reports: <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />,
  marketing: <path d="M3 11l18-7-7 18-2-8-9-3z" strokeLinejoin="round" />,
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
    </>
  ),
  fleet: (
    <>
      <path d="M4 16v-4l2-5a2 2 0 012-1h8a2 2 0 012 1l2 5v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16h18v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" strokeLinejoin="round" />
      <circle cx="7.5" cy="16" r="1.5" />
      <circle cx="16.5" cy="16" r="1.5" />
    </>
  ),
  inventory: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  system: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

const Icon = ({ name, size = 18 }: { name: NavIcon; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
    {ICONS[name]}
  </svg>
);

const STORE = "osta-admin-nav";
const FROM = "osta-admin-nav-from";

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
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const { dashboard, groups } = useMemo(() => visibleNav(adminSections, isSuperAdmin), [adminSections, isSuperAdmin]);

  // Remembered between visits: whether the sidebar is collapsed (desktop) and which modules the user opened.
  const [collapsed, setCollapsed] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [fromGroup, setFromGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Read after mount so the server and first client render agree.
    Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORE) ?? "{}") as { collapsed?: boolean; open?: string[] };
        if (typeof saved.collapsed === "boolean") setCollapsed(saved.collapsed);
        if (Array.isArray(saved.open)) setOpenIds(saved.open.filter((x) => typeof x === "string"));
        setFromGroup(window.sessionStorage.getItem(FROM));
      } catch {
        // Storage blocked or corrupted: start with the defaults.
      }
    });
  }, []);

  const current = useMemo(() => locate(groups, pathname, fromGroup), [groups, pathname, fromGroup]);

  const persist = (next: { collapsed?: boolean; open?: string[] }) => {
    try {
      window.localStorage.setItem(STORE, JSON.stringify({ collapsed, open: openIds, ...next }));
    } catch {
      // Not saving is fine.
    }
  };

  // The module of the page you are on is always open, so the menu never hides where you are.
  const isOpen = (g: NavGroup) => openIds.includes(g.id) || current?.groupId === g.id;

  function toggleGroup(g: NavGroup) {
    if (collapsed) {
      // From the narrow rail, a module icon opens the full sidebar with that module expanded.
      setCollapsed(false);
      const open = openIds.includes(g.id) ? openIds : [...openIds, g.id];
      setOpenIds(open);
      persist({ collapsed: false, open });
      return;
    }
    const open = isOpen(g) && !(current?.groupId === g.id && !openIds.includes(g.id)) ? openIds.filter((x) => x !== g.id) : [...new Set([...openIds, g.id])];
    setOpenIds(open);
    persist({ open });
  }

  function toggleCollapsed() {
    setCollapsed((c) => !c);
    persist({ collapsed: !collapsed });
  }

  function chose(groupId: string) {
    setFromGroup(groupId);
    try {
      window.sessionStorage.setItem(FROM, groupId);
    } catch {
      // ignore
    }
    onClose();
  }

  // Ctrl/Cmd + K jumps to the search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCollapsed(false);
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo(() => searchNav(dashboard ? [{ id: "dash", label: "Dashboard", icon: "dashboard", items: [DASHBOARD] }, ...groups] : groups, query), [query, groups, dashboard]);
  const searching = query.trim().length > 0;
  const narrow = collapsed; // the desktop rail; on mobile the drawer is always full width

  const dashActive = pathname === "/admin";
  const itemBase = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";

  return (
    <aside
      aria-label="Main navigation"
      className={`fixed md:sticky md:top-0 md:h-dvh inset-y-0 left-0 z-30 shrink-0 bg-gradient-to-b from-blue-900 to-blue-950 text-white flex flex-col transition-[transform,width] duration-200 w-72 ${narrow ? "md:w-[4.5rem]" : "md:w-64"} ${
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

      <div className={`px-3 pt-3 ${narrow ? "md:hidden" : ""}`}>
        <label className="relative block">
          <span className="sr-only">Search pages</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
              if (e.key === "Enter" && hits[0]) {
                router.push(hits[0].href);
                setQuery("");
                onClose();
              }
            }}
            placeholder="Search pages…  (Ctrl K)"
            className="w-full rounded-xl bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-blue-300 outline-none focus:bg-white/15 focus:ring-1 focus:ring-white/30"
          />
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1" aria-label="Admin modules">
        {searching ? (
          <ul className="flex flex-col gap-0.5" aria-label="Search results">
            {hits.length === 0 && <li className="px-3 py-2 text-sm text-blue-200">No page matches “{query}”.</li>}
            {hits.map((h) => (
              <li key={h.href + h.label}>
                <Link href={h.href} onClick={() => { setQuery(""); onClose(); }} className="block rounded-lg px-3 py-2 text-sm text-blue-50 hover:bg-white/10">
                  {h.label}
                  <span className="block text-[11px] text-blue-300">{h.group}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {dashboard && (
              <Link
                href={DASHBOARD.href}
                onClick={() => chose("dash")}
                aria-current={dashActive ? "page" : undefined}
                title="Dashboard"
                className={`${itemBase} ${narrow ? "md:justify-center md:px-0" : ""} ${dashActive ? "bg-white text-blue-700" : "text-blue-100 hover:bg-white/10"}`}
              >
                <Icon name="dashboard" />
                <span className={narrow ? "md:hidden" : ""}>Dashboard</span>
              </Link>
            )}

            {groups.map((g) => {
              const expanded = !narrow && isOpen(g);
              const isCurrent = current?.groupId === g.id;
              return (
                <div key={g.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(g)}
                    aria-expanded={expanded}
                    aria-controls={`nav-${g.id}`}
                    title={g.label}
                    className={`${itemBase} w-full text-left ${narrow ? "md:justify-center md:px-0" : ""} ${isCurrent ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10"}`}
                  >
                    <Icon name={g.icon} />
                    <span className={`flex-1 ${narrow ? "md:hidden" : ""}`}>{g.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${expanded ? "rotate-90" : ""} ${narrow ? "md:hidden" : ""}`} aria-hidden>
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {expanded && (
                    <ul id={`nav-${g.id}`} className="ml-4 mt-1 mb-1 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                      {g.items.map((item) => {
                        const active = isCurrent && current?.href === item.href;
                        const inside = active && item.children;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => chose(g.id)}
                              aria-current={active ? "page" : undefined}
                              className={`block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${active ? "bg-white text-blue-700" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}
                            >
                              {item.label}
                            </Link>
                            {inside && (
                              <ul className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                                {item.children!.map((c) => {
                                  const cp = c.href.split("?")[0];
                                  const cActive = c.href === item.href ? pathname === cp : pathname === cp || pathname.startsWith(`${cp}/`);
                                  return (
                                    <li key={c.href}>
                                      <Link href={c.href} onClick={() => chose(g.id)} className={`block rounded-md px-2.5 py-1.5 text-xs font-medium ${cActive ? "bg-white/15 text-white" : "text-blue-300 hover:bg-white/10"}`}>
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
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      <div className={`px-4 py-4 border-t border-white/10 flex items-center gap-3 ${narrow ? "md:justify-center md:px-2" : ""}`}>
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold" title={adminName}>
          {initials(adminName)}
        </div>
        <div className={`flex-1 min-w-0 ${narrow ? "md:hidden" : ""}`}>
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
